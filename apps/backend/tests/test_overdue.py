import asyncio
from datetime import date
from unittest.mock import AsyncMock, Mock

from backend.routers import analysis, goals
from backend.utils.client_date import resolve_client_today

SERVER_TODAY = date(2026, 10, 15)


# --- resolve_client_today ---------------------------------------------------


def test_client_date_within_a_day_of_utc_is_trusted():
    # UTC+7 user just after local midnight: a day ahead of the server.
    assert resolve_client_today("2026-10-16", SERVER_TODAY) == date(2026, 10, 16)
    assert resolve_client_today("2026-10-14", SERVER_TODAY) == date(2026, 10, 14)


def test_client_date_too_far_from_utc_falls_back_to_yesterday():
    # A wrong phone clock must not fail tasks early.
    assert resolve_client_today("2026-10-20", SERVER_TODAY) == date(2026, 10, 14)


def test_missing_or_malformed_client_date_falls_back_to_yesterday():
    assert resolve_client_today(None, SERVER_TODAY) == date(2026, 10, 14)
    assert resolve_client_today("not-a-date", SERVER_TODAY) == date(2026, 10, 14)


# --- fail_overdue_tasks -----------------------------------------------------


class FakeConnection:
    def __init__(self):
        self.fetch = AsyncMock()
        self.execute = AsyncMock()
        self.transaction = Mock(return_value=self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None


def patch_pool(monkeypatch, module, connection):
    async def get_pool():
        return Mock(acquire=lambda: connection)

    monkeypatch.setattr(module, "get_db_pool", get_pool)


def test_fail_overdue_tasks_fails_before_local_today_and_settles_each_goal(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = [
        {"assigned_goal_id": 7},
        {"assigned_goal_id": 7},
        {"assigned_goal_id": 8},
    ]
    check = AsyncMock()
    monkeypatch.setattr(goals, "check_goal_status", check)

    asyncio.run(goals.fail_overdue_tasks(connection, "user-1", date(2026, 10, 16)))

    sql = " ".join(connection.fetch.await_args.args[0].split())
    assert "SET status = 'failed'" in sql
    assert "at.status = 'pending'" in sql
    assert "ati.interval_date < $2" in sql
    assert connection.fetch.await_args.args[1:] == ("user-1", date(2026, 10, 16))
    assert sorted(call.args[1] for call in check.await_args_list) == [7, 8]


def test_fail_overdue_tasks_without_overdue_tasks_settles_nothing(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = []
    check = AsyncMock()
    monkeypatch.setattr(goals, "check_goal_status", check)

    asyncio.run(goals.fail_overdue_tasks(connection, "user-1", date(2026, 10, 16)))

    check.assert_not_awaited()


# --- wiring -----------------------------------------------------------------


def test_goals_today_uses_device_date_not_viewed_date(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = []
    patch_pool(monkeypatch, goals, connection)
    overdue = AsyncMock()
    monkeypatch.setattr(goals, "fail_overdue_tasks", overdue)

    # The user is browsing next week; overdue handling must use the real date.
    asyncio.run(
        goals.get_goals_today(
            today=date(2026, 10, 22),
            user_id="user-1",
            client_today=date(2026, 10, 16),
        )
    )

    overdue.assert_awaited_once_with(connection, "user-1", date(2026, 10, 16))
    assert connection.fetch.await_args.args[-1] == date(2026, 10, 22)


def test_analysis_fails_overdue_tasks_before_computing(monkeypatch):
    connection = FakeConnection()
    connection.fetch.return_value = []
    patch_pool(monkeypatch, analysis, connection)
    overdue = AsyncMock()
    monkeypatch.setattr(analysis, "fail_overdue_tasks", overdue)

    asyncio.run(analysis.read_analysis(user_id="user-1", client_today=date(2026, 10, 16)))

    overdue.assert_awaited_once_with(connection, "user-1", date(2026, 10, 16))
