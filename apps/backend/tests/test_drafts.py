import asyncio
import os
from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException

from backend.const.types import RepeatType
from backend.routers import drafts
from backend.routers.drafts import DraftGoal, DraftTask, build_goal, monthly_dates

TODAY = date(2026, 10, 16)


def draft(**overrides):
    base = dict(
        title="Read more",
        start_date=date(2026, 10, 20),
        due_date=date(2026, 11, 18),
        tasks=[DraftTask(title="Read", type="daily")],
    )
    base.update(overrides)
    return DraftGoal(**base)


# --- build_goal: start rules --------------------------------------------------


def test_future_planned_start_is_kept():
    goal = build_goal(draft(), TODAY)
    assert (goal.start_date, goal.due_date) == (date(2026, 10, 20), date(2026, 11, 18))


def test_past_planned_start_shifts_to_today_keeping_length():
    goal = build_goal(draft(start_date=date(2026, 10, 10), due_date=date(2026, 10, 19)), TODAY)
    assert goal.start_date == TODAY
    assert goal.due_date == TODAY + timedelta(days=9)  # still 10 days long


def test_specific_dates_move_with_the_shift():
    d = draft(
        start_date=date(2026, 10, 10),
        due_date=date(2026, 10, 19),
        tasks=[DraftTask(title="Exam", type="normal", selectedDates=[date(2026, 10, 12)])],
    )
    task = build_goal(d, TODAY).tasks[0]
    assert task.repeat_type == RepeatType.DATE
    assert task.date_interval == [date(2026, 10, 18)]  # shifted by 6 days


def test_monthly_days_are_recomputed_for_the_real_range():
    d = draft(
        start_date=date(2026, 10, 1),
        due_date=date(2026, 12, 31),
        tasks=[DraftTask(title="Budget", type="monthly", monthlyMode="end")],
    )
    task = build_goal(d, TODAY).tasks[0]  # shifted: Oct 16 .. Jan 15
    assert task.date_interval == [date(2026, 10, 31), date(2026, 11, 30), date(2026, 12, 31)]


def test_monthly_modes():
    assert monthly_dates(date(2026, 1, 1), date(2026, 2, 28), "start") == [
        date(2026, 1, 1), date(2026, 2, 1)]
    assert monthly_dates(date(2026, 1, 1), date(2026, 2, 28), "mid") == [
        date(2026, 1, 16), date(2026, 2, 14)]
    assert monthly_dates(date(2026, 1, 20), date(2026, 3, 10), "end") == [
        date(2026, 1, 31), date(2026, 2, 28)]


def test_weekly_and_daily_tasks_convert():
    d = draft(tasks=[
        DraftTask(title="Run", type="weekly", selectedDaysOfWeek=[3, 1, 1]),
        DraftTask(title="Read", type="daily"),
    ])
    weekly, daily = build_goal(d, TODAY).tasks
    assert (weekly.repeat_type, weekly.week_interval) == (RepeatType.WEEKLY, [1, 3])
    assert daily.repeat_type == RepeatType.DAILY


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"title": "  "}, "title"),
        ({"start_date": None}, "start and end dates"),
        ({"due_date": date(2026, 10, 1)}, "before the start date"),
        ({"tasks": []}, "at least one task"),
        ({"tasks": [DraftTask(title="", type="daily")]}, "needs a title"),
        ({"tasks": [DraftTask(title="Run", type="weekly")]}, "weekday"),
        ({"tasks": [DraftTask(title="Exam", type="normal")]}, "no dates"),
    ],
)
def test_incomplete_drafts_cannot_start(overrides, message):
    with pytest.raises(HTTPException) as error:
        build_goal(draft(**overrides), TODAY)
    assert error.value.status_code == 400
    assert message in error.value.detail


# --- integration: save -> start on real Postgres (rolled back) ---------------

DB_URL = os.environ.get("INTEGRATION_DATABASE_URL")
MIGRATION = Path(__file__).resolve().parents[1] / "migrations" / "001_goal_draft.sql"
USER = "user_draft_it"


@pytest.mark.skipif(not DB_URL, reason="INTEGRATION_DATABASE_URL not set")
def test_start_draft_creates_goal_and_removes_draft(monkeypatch):
    import asyncpg

    async def pool_for(conn):
        class Pool:
            def acquire(self):
                class Ctx:
                    async def __aenter__(self):
                        return conn

                    async def __aexit__(self, *_):
                        return None

                return Ctx()

        return Pool()

    async def main():
        conn = await asyncpg.connect(DB_URL, statement_cache_size=0)
        tr = conn.transaction()
        await tr.start()
        try:
            await conn.execute(MIGRATION.read_text(encoding="utf-8"))  # works before it's applied
            await conn.execute("INSERT INTO public.user (id, username) VALUES ($1, 'it')", USER)
            monkeypatch.setattr(drafts, "get_db_pool", lambda: pool_for(conn))

            created = await drafts.create_draft(
                draft(start_date=date(2026, 10, 10), due_date=date(2026, 10, 19)), user_id=USER
            )
            listed = await drafts.list_drafts(user_id=USER)
            assert [d["id"] for d in listed] == [created["id"]]
            assert listed[0]["title"] == "Read more"

            result = await drafts.start_draft(created["id"], user_id=USER, client_today=TODAY)

            assert result["start_date"] == TODAY.isoformat() and result["shifted_days"] == 6
            assert await drafts.list_drafts(user_id=USER) == []
            days = await conn.fetchval(
                """SELECT count(*) FROM assigned_task at
                   JOIN assigned_goal ag ON ag.id = at.assigned_goal_id
                   WHERE ag.user_id = $1""",
                USER,
            )
            assert days == 10  # daily task over the shifted 10-day range
        finally:
            await tr.rollback()
            await conn.close()

    asyncio.run(main())


def test_create_draft_makes_sure_the_user_row_exists(monkeypatch):
    from unittest.mock import AsyncMock

    calls = []

    class Conn:
        async def execute(self, sql, *args):
            calls.append(("execute", sql, args))

        async def fetchval(self, sql, *args):
            calls.append(("fetchval", sql, args))
            return 42

    conn = Conn()

    class Pool:
        def acquire(self):
            class Ctx:
                async def __aenter__(self):
                    return conn

                async def __aexit__(self, *_):
                    return None

            return Ctx()

    monkeypatch.setattr(drafts, "get_db_pool", AsyncMock(return_value=Pool()))

    result = asyncio.run(drafts.create_draft(draft(), user_id="user-new"))

    assert result == {"id": 42}
    assert "ON CONFLICT (id) DO NOTHING" in calls[0][1] and calls[0][2] == ("user-new",)
    assert "INSERT INTO public.goal_draft" in calls[1][1]  # after the user row
