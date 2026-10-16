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

    result = asyncio.run(goals.update_task_status(request, user_id="user-1"))

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
        asyncio.run(goals.update_task_status(request, user_id="user-1"))

    assert error.value.status_code == 404
    connection.execute.assert_not_awaited()


def test_get_goals_today_defaults_to_current_date(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = []
    patch_pool(monkeypatch, connection)

    result = asyncio.run(goals.get_goals_today(today=None, user_id="user-1"))

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

    response = asyncio.run(goals.update_goal(make_update_request(), user_id="user-1"))

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
        asyncio.run(goals.update_goal(make_update_request(), user_id="user-1"))

    assert error.value.status_code == 404
    assert connection.execute.await_count == 1


def test_get_all_goals_returns_progress_and_settles_overdue_first(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = [
        {
            "id": 3,
            "title": "Invest monthly",
            "type": "custom goal",
            "status": "pending",
            "start_date": date(2026, 10, 1),
            "due_date": date(2027, 9, 30),
            "total_tasks": 12,
            "completed_tasks": 1,
            "failed_tasks": 0,
            "pending_tasks": 11,
        }
    ]
    overdue = AsyncMock()
    monkeypatch.setattr(goals, "fail_overdue_tasks", overdue)
    patch_pool(monkeypatch, connection)

    result = asyncio.run(
        goals.get_all_goals(user_id="user-1", client_today=date(2026, 10, 16))
    )

    overdue.assert_awaited_once_with(connection, "user-1", date(2026, 10, 16))
    assert connection.fetch.await_args.args[1:] == ("user-1",)
    assert "WHERE ag.user_id = $1" in connection.fetch.await_args.args[0]
    assert len(result) == 1
    assert result[0].title == "Invest monthly"
    assert (result[0].completed_tasks, result[0].total_tasks) == (1, 12)


def test_all_goals_route_is_declared_before_goal_id_route():
    paths = [route.path for route in goals.router.routes]
    assert paths.index("/all") < paths.index("/{assigned_goal_id}")


def test_update_task_status_rejects_tasks_scheduled_after_today(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = [
        {"id": 1, "assigned_goal_id": 7, "interval_date": date(2026, 10, 16)},
        {"id": 2, "assigned_goal_id": 7, "interval_date": date(2026, 10, 20)},
    ]
    patch_pool(monkeypatch, connection)
    request = TaskUpdateRequest(to=Status.SUCCESS, assigned_task_id=[1, 2])

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            goals.update_task_status(
                request, user_id="user-1", client_today=date(2026, 10, 16)
            )
        )

    assert error.value.status_code == 400
    assert "Oct 20" in error.value.detail
    connection.execute.assert_not_awaited()


def test_update_task_status_allows_today_and_past_tasks(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = [
        {"id": 1, "assigned_goal_id": 7, "interval_date": date(2026, 10, 16)},
        {"id": 2, "assigned_goal_id": 7, "interval_date": date(2026, 10, 15)},
    ]
    connection.execute.return_value = "UPDATE 2"
    monkeypatch.setattr(goals, "check_goal_status", AsyncMock())
    patch_pool(monkeypatch, connection)
    request = TaskUpdateRequest(to=Status.FAILED, assigned_task_id=[1, 2])

    result = asyncio.run(
        goals.update_task_status(
            request, user_id="user-1", client_today=date(2026, 10, 16)
        )
    )

    assert result["assigned_task_id"] == [1, 2]
