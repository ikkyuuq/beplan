from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from backend.routers.ai import PredictionResult, router

client = TestClient(router)


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


@pytest.fixture
def question_response(mock_tagger):
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
    res = question_response

    assert len(res) == 1
    assert res.keys() == {"achievable"}
    assert res["achievable"]["type"] in ["open-ended", "yes-no"]


def test_question_generate_empty_criteria(mock_tagger):
    resp = client.post(
        "/generate-questions",
        json={
            "original_text": G_PERFECT_PREDICTION_RESULT.original_text,
            "prediction": G_PERFECT_PREDICTION_RESULT.prediction,
        },
    )

    res = resp.json()

    assert len(res) == 1
    assert res == {"message": "No questions needed - all criteria are filled"}


def test_submit_question(question_response):
    question = question_response["achievable"]["question"]
    to_label = question_response.keys()
    prediction_data = {
        "original_text": G_PREDICTION_RESULT.original_text,
        "prediction": G_PREDICTION_RESULT.prediction,
    }
    request = {
        "prediction_result": prediction_data,
        "question": question,
        "to_label": list(to_label)[0],  # Convert set to list {key} -> [key]
        "value": "yes",
    }

    resp = client.post("/submit-question", json=request)
    assert resp.status_code == 200
    assert list(to_label)[0] in "achievable"
    assert resp.json()["message"] == "Successfully updated prediction"


def test_generate_task(mock_tagger):
    resp = client.post(
        "/generate-task",
        json={
            "original_text": G_PERFECT_PREDICTION_RESULT.original_text,
            "prediction": G_PERFECT_PREDICTION_RESULT.prediction,
        },
    )
    assert resp.status_code == 200

    res = resp.json()

    assert "tasks" in res
    assert isinstance(res["tasks"], list)
    assert len(res["tasks"]) > 0

    for task in res["tasks"]:
        assert "title" in task
        assert "description" in task
        assert "task_date" in task
        assert "repeat_type" in task
