import asyncio
import os
import sys
import threading
import types
from unittest.mock import Mock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

# Keep these unit tests isolated from external APIs, model downloads, and heavyweight ML packages.
os.environ.setdefault("ANTHROPIC_API_KEY", "unit-test-key")


class _Sentence:
    def __init__(self, text):
        self.text = text

    def get_spans(self, _layer):
        return []


class _SequenceTagger:
    @staticmethod
    def load(_model_path):
        return Mock()


class _Anthropic:
    def __init__(self, api_key):
        self.api_key = api_key


_stubs = {
    "anthropic": types.ModuleType("anthropic"),
    "flair": types.ModuleType("flair"),
    "flair.data": types.ModuleType("flair.data"),
    "flair.models": types.ModuleType("flair.models"),
    "huggingface_hub": types.ModuleType("huggingface_hub"),
}
_stubs["anthropic"].Anthropic = _Anthropic
_stubs["flair.data"].Sentence = _Sentence
_stubs["flair.models"].SequenceTagger = _SequenceTagger
_stubs["huggingface_hub"].hf_hub_download = lambda **_kwargs: "unit-test-model"
_original_modules = {name: sys.modules.get(name) for name in _stubs}
sys.modules.update(_stubs)

from backend.routers.ai import (
    AIInput,
    PredictionResult,
    generate_goal,
    generate_questions,
    router,
    validate_sentence,
)
from backend.routers import ai as ai_module

for _module_name, _original_module in _original_modules.items():
    if _original_module is None:
        sys.modules.pop(_module_name, None)
    else:
        sys.modules[_module_name] = _original_module

app = FastAPI()
app.include_router(router)
client = TestClient(app)


class Sentence:
    def __init__(self, text):
        self.text = text

    def __eq__(self, other):
        return self.text == other.text


G_SENTENCE = Sentence("I want to lose 10 pounds in 2 months")
G_PREDICTION_RESULT = PredictionResult(
    original_text=G_SENTENCE.text,
    prediction={
        "specific": [{"text": "lose", "from": "original_text"}],
        "measurable": [{"text": "10 pounds", "from": "original_text"}],
        "achievable": [],
        "relevant": [{"text": "want", "from": "original_text"}],
        "time_bound": [{"text": "2 months", "from": "original_text"}],
    },
)


G_PERFECT_PREDICTION_RESULT = PredictionResult(
    original_text=G_SENTENCE.text,
    prediction={
        "specific": [{"text": "lose", "from": "original_text"}],
        "measurable": [{"text": "10 pounds", "from": "original_text"}],
        "achievable": [{"text": "yes", "from": "question"}],
        "relevant": [{"text": "want", "from": "original_text"}],
        "time_bound": [{"text": "2 months", "from": "original_text"}],
    },
)


@pytest.fixture
def mock_tagger():
    # Patch the 'tagger' instance used in your routes.
    with patch("backend.routers.ai.tagger") as mock_tagger:
        # Define a fake predict that modifies the passed-in sentence.
        def fake_predict(sentence):
            # Create a list of fake span objects.
            fake_spans = []
            # Define the span data as (text, label_value).
            spans_data = [
                ("lose", "specific"),
                ("10 pounds", "measurable"),
                ("want", "relevant"),
                ("2 months", "time-bound"),
            ]
            for text, label_value in spans_data:
                mock_span = Mock()
                mock_span.text = text

                # Each span should have a labels attribute that is a list containing a label object.
                mock_label = Mock()
                mock_label.value = label_value
                mock_span.labels = [mock_label]
                fake_spans.append(mock_span)

            # Override the sentence's get_spans method to return our fake spans.
            sentence.get_spans = lambda key: fake_spans if key == "ner" else []
            # Note: The route does not use the return value of predict.

        # Set the predict method on the patched tagger.
        mock_tagger.predict.side_effect = fake_predict

        yield mock_tagger


def test_validate_sentence(mock_tagger):
    resp = client.post("/validate", json={"text": G_SENTENCE.text})
    assert resp.status_code == 200

    res = resp.json()

    assert res["original_text"] == G_SENTENCE.text
    prediction = res["prediction"]

    for key in G_PREDICTION_RESULT.prediction:
        if prediction.get(key) is not None:
            assert prediction.get(key) == G_PREDICTION_RESULT.prediction[key]


def test_validate_runs_flair_in_threadpool(mock_tagger):
    inference_threads = []

    def fake_predict(sentence):
        inference_threads.append(threading.get_ident())
        sentence.get_spans = lambda key: []

    mock_tagger.predict.side_effect = fake_predict

    async def validate():
        event_loop_thread = threading.get_ident()
        await validate_sentence(AIInput(text=G_SENTENCE.text))
        assert inference_threads[0] != event_loop_thread

    asyncio.run(validate())


def test_generate_questions_runs_anthropic_in_threadpool(monkeypatch):
    request_threads = []

    def fake_call_anthropic_api(**kwargs):
        request_threads.append(threading.get_ident())
        return {"result": []}

    monkeypatch.setattr(
        "backend.routers.ai.call_anthropic_api", fake_call_anthropic_api
    )
    request = PredictionResult(
        original_text=G_SENTENCE.text,
        prediction={
            "specific": [],
            "measurable": [],
            "achievable": [],
            "relevant": [],
            "time_bound": [],
        },
    )

    async def generate():
        event_loop_thread = threading.get_ident()
        await generate_questions(request)
        assert request_threads[0] != event_loop_thread

    asyncio.run(generate())


@pytest.fixture
def question_response(mock_tagger, monkeypatch):
    monkeypatch.setattr(
        ai_module,
        "call_anthropic_api",
        lambda **_kwargs: {
            "result": [
                {
                    "label": "achievable",
                    "question": "Is this achievable?",
                    "type": "yes-no",
                },
                {
                    "label": "already-filled",
                    "question": "Ignore this?",
                    "type": "open-ended",
                },
            ]
        },
    )
    resp = client.post(
        "/generate-questions",
        json={
            "original_text": G_PREDICTION_RESULT.original_text,
            "prediction": G_PREDICTION_RESULT.prediction,
        },
    )
    assert resp.status_code == 200

    return resp.json()


def test_question_generate(question_response):
    questions = question_response["result"]

    assert questions == [
        {
            "label": "achievable",
            "question": "Is this achievable?",
            "type": "yes-no",
        }
    ]


def test_question_generate_empty_criteria(mock_tagger):
    resp = client.post(
        "/generate-questions",
        json={
            "original_text": G_PERFECT_PREDICTION_RESULT.original_text,
            "prediction": G_PERFECT_PREDICTION_RESULT.prediction,
        },
    )

    assert resp.status_code == 200
    res = resp.json()

    assert res == {"result": []}


def test_submit_question(question_response):
    question = question_response["result"][0]["question"]
    to_label = question_response["result"][0]["label"]
    prediction_data = {
        "original_text": G_PREDICTION_RESULT.original_text,
        "prediction": G_PREDICTION_RESULT.prediction,
    }
    request = {
        "prediction_result": prediction_data,
        "question": question,
        "to_label": to_label,
        "value": "yes",
    }

    resp = client.post("/submit-question", json=request)
    assert resp.status_code == 200
    assert to_label == "achievable"
    assert resp.json()["message"] == "Successfully updated prediction"


def test_submit_question_preserves_invalid_label_http_400():
    resp = client.post(
        "/submit-question",
        json={
            "prediction_result": {
                "original_text": G_PREDICTION_RESULT.original_text,
                "prediction": G_PREDICTION_RESULT.prediction,
            },
            "question": "Invalid label test",
            "to_label": "not-a-smart-criterion",
            "value": "answer",
        },
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == (
        "Invalid prediction type: not-a-smart-criterion"
    )


def test_generate_goal_uses_prediction_deadline(monkeypatch):
    generated_goal = {
        "title": "Lose 10 pounds",
        "type": "smart goal",
        "tasks": [{"title": "Walk", "repeat_type": "daily"}],
    }
    call = Mock(return_value=generated_goal)
    monkeypatch.setattr(ai_module, "call_anthropic_api", call)
    request = G_PERFECT_PREDICTION_RESULT

    result = asyncio.run(generate_goal(request))

    assert result == generated_goal
    prompt = call.call_args.kwargs["prompt"]
    assert "due_date" in prompt
    assert "2 months" in prompt
    assert "I want to lose 10 pounds in 2 months" in prompt


def test_generate_goal_returns_http_500_when_provider_fails(monkeypatch):
    monkeypatch.setattr(
        ai_module,
        "call_anthropic_api",
        Mock(side_effect=RuntimeError("provider unavailable")),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(generate_goal(G_PERFECT_PREDICTION_RESULT))

    assert error.value.status_code == 500


def test_generate_goal_requires_time_bound(monkeypatch):
    call = Mock()
    monkeypatch.setattr(ai_module, "call_anthropic_api", call)
    request = PredictionResult(
        original_text="I want to lose 10 pounds",
        prediction={"specific": [{"text": "lose"}], "time_bound": []},
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(generate_goal(request))

    assert error.value.status_code == 400
    call.assert_not_called()
