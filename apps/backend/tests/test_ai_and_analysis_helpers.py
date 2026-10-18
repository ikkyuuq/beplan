import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.routers.ai import call_anthropic_api, normalize_label, parse_ai_response
from backend.routers.analysis import (
    Status,
    compute_tasks_analysis,
    fetch_assigned_goals,
    fetch_assigned_tasks,
    fetch_tasks_with_intervals,
    fetch_templates,
)


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


def test_compute_tasks_analysis_groups_statuses_and_calculates_rate():
    result = asyncio.run(
        compute_tasks_analysis(
            [
                {
                    "assigned_task_id": 1,
                    "assigned_goal_id": 9,
                    "title": "Run",
                    "description": "5 km",
                    "status": Status.SUCCESS,
                },
                {
                    "assigned_task_id": 2,
                    "assigned_goal_id": 9,
                    "title": "Read",
                    "description": "10 pages",
                    "status": Status.PENDING,
                },
            ],
            {"sun": 1},
        )
    )

    assert result["total"] == 2
    assert result["completed"] == 1
    assert result["pending"] == 1
    assert result["success_rate"] == 50.0
    assert result["weekly_distribution"] == {"sun": 1}


@pytest.mark.parametrize(
    "helper",
    [
        fetch_tasks_with_intervals,
        fetch_assigned_goals,
        fetch_assigned_tasks,
        fetch_templates,
    ],
)
def test_analysis_fetch_helpers_pass_user_id_to_database(helper):
    conn = SimpleNamespace(fetch=AsyncMock(return_value=[]))

    assert asyncio.run(helper(conn, "user-1")) == []
    conn.fetch.assert_awaited_once()
    assert conn.fetch.await_args.args[-1] == "user-1"
