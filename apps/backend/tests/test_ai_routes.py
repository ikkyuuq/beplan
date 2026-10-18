import asyncio
import os
import sys
import threading
import types
from datetime import date
from unittest.mock import Mock, patch

import anthropic
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


_stubs = {
    "flair": types.ModuleType("flair"),
    "flair.data": types.ModuleType("flair.data"),
    "flair.models": types.ModuleType("flair.models"),
    "huggingface_hub": types.ModuleType("huggingface_hub"),
}
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


TODAY = date(2026, 10, 18)


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

    result = asyncio.run(generate_goal(request, client_today=TODAY))

    assert result == {
        "title": "Lose 10 pounds",
        "type": "smart goal",
        "start_date": "2026-10-18",
        "due_date": "2026-12-17",
        "tasks": [
            {"title": "Walk", "description": None, "repeat_type": "daily",
             "date_interval": None, "week_interval": None}
        ],
    }
    assert call.call_args.kwargs["max_tokens"] == 16000
    prompt = call.call_args.kwargs["prompt"]
    assert '"due_date": "2026-12-17"' in prompt
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
        asyncio.run(generate_goal(G_PERFECT_PREDICTION_RESULT, client_today=TODAY))

    assert error.value.status_code == 500


def test_generate_goal_requires_time_bound(monkeypatch):
    call = Mock()
    monkeypatch.setattr(ai_module, "call_anthropic_api", call)
    request = PredictionResult(
        original_text="I want to lose 10 pounds",
        prediction={"specific": [{"text": "lose"}], "time_bound": []},
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(generate_goal(request, client_today=TODAY))

    assert error.value.status_code == 400
    call.assert_not_called()


def anthropic_status_error(error_class, status, message):
    import httpx

    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(status, request=request)
    return error_class(message, response=response, body=None)


@pytest.mark.parametrize(
    "error, status, detail_part",
    [
        (lambda: anthropic_status_error(anthropic.AuthenticationError, 401, "invalid x-api-key"), 502, "API key"),
        (lambda: anthropic_status_error(anthropic.BadRequestError, 400, "Your credit balance is too low"), 502, "credit"),
        (lambda: anthropic_status_error(anthropic.NotFoundError, 404, "model not found"), 502, "model"),
        (lambda: anthropic_status_error(anthropic.RateLimitError, 429, "rate limited"), 503, "busy"),
        (lambda: anthropic_status_error(anthropic.InternalServerError, 529, "overloaded"), 503, "busy"),
        (lambda: anthropic.APIConnectionError(request=__import__("httpx").Request("POST", "https://x")), 503, "reach"),
    ],
)
def test_call_anthropic_api_maps_provider_errors(monkeypatch, error, status, detail_part):
    client = Mock()
    client.messages.create.side_effect = error()
    monkeypatch.setattr(ai_module, "client", client)

    with pytest.raises(HTTPException) as raised:
        ai_module.call_anthropic_api(model="m", system="s", prompt="p")

    assert raised.value.status_code == status
    assert detail_part in raised.value.detail


def test_generate_questions_passes_provider_error_through(monkeypatch):
    client = Mock()
    client.messages.create.side_effect = anthropic_status_error(
        anthropic.AuthenticationError, 401, "invalid x-api-key"
    )
    monkeypatch.setattr(ai_module, "client", client)
    request = PredictionResult(
        original_text="I want to run",
        prediction={"specific": [{"text": "run"}], "time_bound": []},
    )

    with pytest.raises(HTTPException) as raised:
        asyncio.run(ai_module.generate_questions(request))

    assert raised.value.status_code == 502


@pytest.mark.parametrize(
    "text, expected",
    [
        ("2026-12-01", date(2026, 12, 1)),
        ("2 months", date(2026, 12, 17)),
        ("in three weeks", date(2026, 11, 7)),
        ("a year", date(2027, 10, 17)),
        ("10 days", date(2026, 10, 27)),
        ("by summer", None),
        ("2026-10-18", None),  # not after today
        ("2020-01-01", None),
        ("50 years", None),
    ],
)
def test_resolve_due_date(text, expected):
    assert ai_module.resolve_due_date(text, TODAY) == expected


def test_clean_generated_goal_keeps_only_valid_tasks_inside_the_goal():
    due = date(2026, 11, 30)
    goal = ai_module.clean_generated_goal(
        {
            "title": "  Run 5K  ",
            "start_date": "2024-01-01",
            "due_date": "2024-02-01",
            "tasks": [
                {"title": "Run", "repeat_type": "weekly", "week_interval": [0, 2, 9, 2]},
                {"title": "Race", "repeat_type": "date", "date_interval": ["2026-11-29", "2027-01-01"]},
                {"title": "Out of range", "repeat_type": "monthly", "date_interval": ["2027-01-01"]},
                {"title": "No days", "repeat_type": "weekly", "week_interval": []},
                {"title": "Bad type", "repeat_type": "hourly"},
                {"repeat_type": "daily"},
                {"title": "Stretch", "repeat_type": "daily", "week_interval": [1]},
            ],
        },
        TODAY,
        due,
    )

    assert goal["title"] == "Run 5K"
    assert (goal["start_date"], goal["due_date"]) == ("2026-10-18", "2026-11-30")
    assert [t["title"] for t in goal["tasks"]] == ["Run", "Race", "Stretch"]
    assert goal["tasks"][0]["week_interval"] == [0, 2]
    assert goal["tasks"][1]["date_interval"] == ["2026-11-29"]
    assert goal["tasks"][2]["week_interval"] is None


def test_clean_generated_goal_uses_ai_due_date_only_when_sensible():
    tasks = [{"title": "Walk", "repeat_type": "daily"}]
    goal = ai_module.clean_generated_goal({"due_date": "2027-06-01", "tasks": tasks}, TODAY, None)
    assert goal["due_date"] == "2027-06-01"
    for bad in ["summer", "2026-01-01", None]:
        with pytest.raises(HTTPException) as raised:
            ai_module.clean_generated_goal({"due_date": bad, "tasks": tasks}, TODAY, None)
        assert raised.value.status_code == 502


def test_clean_generated_goal_rejects_plan_without_tasks():
    with pytest.raises(HTTPException) as raised:
        ai_module.clean_generated_goal({"tasks": [{"title": "x", "repeat_type": "weekly"}]}, TODAY, date(2026, 12, 1))
    assert raised.value.status_code == 502


def test_complete_questions_fills_gaps_and_forces_date_for_deadline():
    questions = ai_module.complete_questions(
        [
            {"label": "time_bound", "question": "When?", "type": "open-ended"},
            {"label": "relevant", "question": "Why?", "type": "weird"},
            {"label": "relevant", "question": "Duplicate", "type": "open-ended"},
            {"label": "specific", "question": "Not missing", "type": "open-ended"},
            "junk",
        ],
        ["measurable", "relevant", "time_bound"],
    )

    assert questions == [
        {"label": "measurable", "question": "How will you measure your progress?", "type": "open-ended"},
        {"label": "relevant", "question": "Why?", "type": "open-ended"},
        {"label": "time_bound", "question": "When?", "type": "date"},
    ]


def test_call_anthropic_api_rejects_truncated_reply(monkeypatch):
    client = Mock()
    client.messages.create.return_value = Mock(stop_reason="max_tokens")
    monkeypatch.setattr(ai_module, "client", client)

    with pytest.raises(HTTPException) as raised:
        ai_module.call_anthropic_api(model="m", system="s", prompt="p", max_tokens=10)

    assert raised.value.status_code == 502
    assert "too long" in raised.value.detail


def test_parse_ai_response_skips_thinking_blocks():
    response = types.SimpleNamespace(
        content=[
            types.SimpleNamespace(type="thinking", thinking="", text=None),
            types.SimpleNamespace(type="text", text='```json\n{"title": "Run"}\n```'),
        ]
    )

    assert ai_module.parse_ai_response(response) == {"title": "Run"}


def test_parse_ai_response_without_text_is_a_502():
    response = types.SimpleNamespace(content=[types.SimpleNamespace(type="thinking", thinking="")])

    with pytest.raises(HTTPException) as raised:
        ai_module.parse_ai_response(response)

    assert raised.value.status_code == 502


def test_call_anthropic_api_reports_refusal(monkeypatch):
    client = Mock()
    client.messages.create.return_value = Mock(stop_reason="refusal")
    monkeypatch.setattr(ai_module, "client", client)

    with pytest.raises(HTTPException) as raised:
        ai_module.call_anthropic_api(model="m", system="s", prompt="p")

    assert raised.value.status_code == 422
