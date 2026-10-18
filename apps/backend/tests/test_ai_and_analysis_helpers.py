from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.routers.ai import call_anthropic_api, normalize_label, parse_ai_response


def test_parse_ai_response_accepts_json_code_fences_and_normalizes_labels():
    response = SimpleNamespace(content=[SimpleNamespace(type="text", text='```json\n{"ok": true}\n```')])

    assert parse_ai_response(response) == {"ok": True}
    assert normalize_label("time-bound") == "time_bound"


def test_parse_ai_response_rejects_invalid_json():
    response = SimpleNamespace(content=[SimpleNamespace(type="text", text="not-json")])

    with pytest.raises(HTTPException) as error:
        parse_ai_response(response)

    assert error.value.status_code == 502


def test_call_anthropic_api_reports_missing_configuration(monkeypatch):
    monkeypatch.setattr("backend.routers.ai.client", None)

    with pytest.raises(HTTPException) as error:
        call_anthropic_api("model", "system", "prompt")

    assert error.value.status_code == 503
