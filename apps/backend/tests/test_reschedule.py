import asyncio
from datetime import date
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.routers import reschedule
from backend.routers.reschedule import RescheduleTaskRequest


class FakePool:
    def __init__(self, connection):
        self.connection = connection

    def acquire(self):
        return self.connection


class FakeConnection:
    def __init__(self):
        self.fetchrow = AsyncMock()
        self.execute = AsyncMock()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


def test_reschedule_updates_task_interval_for_owner(monkeypatch):
    connection = FakeConnection()
    connection.fetchrow.return_value = {"id": 12}
    connection.execute.return_value = "UPDATE 1"

    async def get_pool():
        return FakePool(connection)

    monkeypatch.setattr(reschedule, "get_db_pool", get_pool)
    request = RescheduleTaskRequest(
        assigned_task_id=12,
        user_id="user-1",
        new_date=date(2026, 10, 15),
    )

    result = asyncio.run(reschedule.reschedule_task(request))

    assert result == {
        "message": "Task rescheduled to 2026-10-15",
        "assigned_task_id": 12,
    }
    assert connection.fetchrow.await_args.args[-2:] == (12, "user-1")
    assert connection.execute.await_args.args[-2:] == (
        date(2026, 10, 15),
        12,
    )


def test_reschedule_rejects_task_not_owned_by_user(monkeypatch):
    connection = FakeConnection()
    connection.fetchrow.return_value = None

    async def get_pool():
        return FakePool(connection)

    monkeypatch.setattr(reschedule, "get_db_pool", get_pool)
    request = RescheduleTaskRequest(
        assigned_task_id=12,
        user_id="other-user",
        new_date=date(2026, 10, 15),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(reschedule.reschedule_task(request))

    assert error.value.status_code == 404
    connection.execute.assert_not_awaited()


def test_reschedule_reports_when_no_interval_was_updated(monkeypatch):
    connection = FakeConnection()
    connection.fetchrow.return_value = {"id": 12}
    connection.execute.return_value = "UPDATE 0"

    async def get_pool():
        return FakePool(connection)

    monkeypatch.setattr(reschedule, "get_db_pool", get_pool)
    request = RescheduleTaskRequest(
        assigned_task_id=12,
        user_id="user-1",
        new_date=date(2026, 10, 15),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(reschedule.reschedule_task(request))

    assert error.value.status_code == 500
