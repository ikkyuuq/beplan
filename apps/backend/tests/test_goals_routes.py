import asyncio
from datetime import date
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException

from backend.const.types import RepeatType, Status
from backend.routers import goals
from backend.routers.goals import (
    GoalUpdate,
    GoalUpdateRequest,
    TaskUpdate,
    TaskUpdateRequest,
)


class FakeConnection:
    def __init__(self):
        self.fetch = AsyncMock()
        self.fetchrow = AsyncMock()
        self.execute = AsyncMock()
        self.transaction = Mock(return_value=self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


class FakePool:
    def __init__(self, connection):
        self.connection = connection

    def acquire(self):
        return self.connection


def patch_pool(monkeypatch, connection):
    async def get_pool():
        return FakePool(connection)

    monkeypatch.setattr(goals, "get_db_pool", get_pool)


def executed_sql(connection):
    return [" ".join(call.args[0].split()) for call in connection.execute.await_args_list]


def test_update_task_status_updates_all_tasks_and_checks_each_goal(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = [
        {"id": 1, "assigned_goal_id": 7},
        {"id": 2, "assigned_goal_id": 8},
    ]
    connection.execute.return_value = "UPDATE 2"
    check = AsyncMock()
    monkeypatch.setattr(goals, "check_goal_status", check)
    patch_pool(monkeypatch, connection)
    request = TaskUpdateRequest(
        to=Status.SUCCESS, user_id="user-1", assigned_task_id=[1, 2]
    )

    result = asyncio.run(goals.update_task_status(request))

    assert result["assigned_task_id"] == [1, 2]
    assert sorted(call.args[1] for call in check.await_args_list) == [7, 8]


def test_update_task_status_rejects_task_owned_by_another_user(monkeypatch):
    connection = FakeConnection()
    # Only one of the two requested tasks belongs to the user.
    connection.fetch.return_value = [{"id": 1, "assigned_goal_id": 7}]
    patch_pool(monkeypatch, connection)
    request = TaskUpdateRequest(
        to=Status.SUCCESS, user_id="user-1", assigned_task_id=[1, 99]
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(goals.update_task_status(request))

    assert error.value.status_code == 404
    connection.execute.assert_not_awaited()


def test_get_goals_today_defaults_to_current_date(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = []
    patch_pool(monkeypatch, connection)

    result = asyncio.run(goals.get_goals_today("user-1", None))

    assert result == []
    assert connection.fetch.await_args.args[-2:] == ("user-1", date.today())


def make_update_request():
    return GoalUpdateRequest(
        user_id="user-1",
        assigned_goal_id=3,
        goal=GoalUpdate(
            id=9,
            title="Walk",
            start_date=date(2026, 10, 5),
            due_date=date(2026, 10, 6),
            tasks=[
                TaskUpdate(id=5, title="Daily walk", repeat_type=RepeatType.DAILY),
                TaskUpdate(id=6, title="Old task", status=Status.DELETED),
            ],
        ),
    )


def test_update_goal_deletes_intervals_before_assigned_tasks(monkeypatch):
    connection = FakeConnection()
    connection.execute.return_value = "UPDATE 1"
    connection.fetchrow.return_value = {"id": 5}
    patch_pool(monkeypatch, connection)

    response = asyncio.run(goals.update_goal(make_update_request()))

    assert response.status_code == 200
    sql = executed_sql(connection)
    interval_delete = next(
        i for i, s in enumerate(sql) if s.startswith("DELETE FROM assigned_task_interval")
    )
    task_delete = next(
        i for i, s in enumerate(sql) if s.startswith("DELETE FROM assigned_task WHERE")
    )
    assert interval_delete < task_delete
    assert "DELETE FROM task WHERE id = $1 AND goal_id = $2" in sql
    # One assigned_task_interval per day of the daily task (Oct 5 and 6).
    assert sum(s.startswith("INSERT INTO assigned_task_interval") for s in sql) == 2


def test_update_goal_rejects_goal_not_owned_by_user(monkeypatch):
    connection = FakeConnection()
    connection.execute.return_value = "UPDATE 0"
    patch_pool(monkeypatch, connection)

    with pytest.raises(HTTPException) as error:
        asyncio.run(goals.update_goal(make_update_request()))

    assert error.value.status_code == 404
    assert connection.execute.await_count == 1
