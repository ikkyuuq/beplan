"""Integration tests for editing a goal, against a real Postgres.

Skipped unless INTEGRATION_DATABASE_URL is set. Every test runs inside a
transaction that is rolled back (update_goal's own transaction becomes a
savepoint), so nothing is left in the database.
"""

import asyncio
import os
from datetime import date, timedelta

import pytest

from backend.const.types import RepeatType, Status
from backend.routers import goals
from backend.routers.goals import GoalUpdate, GoalUpdateRequest, TaskUpdate
from backend.utils.goal_creation import insert_assigned_task_dates

DB_URL = os.environ.get("INTEGRATION_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="INTEGRATION_DATABASE_URL not set")

TODAY = date(2026, 10, 16)
USER = "user_goal_update_it"


class _Pool:
    """get_db_pool() stand-in that hands out the test's (open) connection."""

    def __init__(self, conn):
        self.conn = conn

    def acquire(self):
        conn = self.conn

        class _Ctx:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *_):
                return None

        return _Ctx()


def run(scenario):
    """Run scenario(conn) inside a transaction that is always rolled back."""
    import asyncpg

    async def main():
        conn = await asyncpg.connect(DB_URL, statement_cache_size=0)
        tr = conn.transaction()
        await tr.start()
        try:
            await scenario(conn)
        finally:
            await tr.rollback()
            await conn.close()

    asyncio.run(main())


async def make_goal(conn, start, due):
    """A goal with one daily task, scheduled every day from start to due."""
    await conn.execute("INSERT INTO public.user (id, username) VALUES ($1, 'it')", USER)
    goal_id = await conn.fetchval(
        "INSERT INTO goal (title, type) VALUES ('Walk', 'custom goal') RETURNING id"
    )
    task_id = await conn.fetchval(
        "INSERT INTO task (title, goal_id, type) VALUES ('Daily walk', $1, 'daily') RETURNING id",
        goal_id,
    )
    ag_id = await conn.fetchval(
        """INSERT INTO assigned_goal (start_date, due_date, user_id, goal_id)
           VALUES ($1, $2, $3, $4) RETURNING id""",
        start,
        due,
        USER,
        goal_id,
    )
    days = [start + timedelta(days=i) for i in range((due - start).days + 1)]
    await insert_assigned_task_dates(conn, ag_id, task_id, days)
    return goal_id, task_id, ag_id


async def set_status(conn, ag_id, day, status):
    await conn.execute(
        """UPDATE assigned_task SET status = $3::status WHERE id = (
             SELECT at.id FROM assigned_task at
             JOIN assigned_task_interval ati ON ati.assigned_task_id = at.id
             WHERE at.assigned_goal_id = $1 AND ati.interval_date = $2)""",
        ag_id,
        day,
        status,
    )


async def days_by_status(conn, ag_id, task_id=None):
    rows = await conn.fetch(
        """SELECT ati.interval_date AS day, at.status::text AS status, at.task_id
           FROM assigned_task at
           JOIN assigned_task_interval ati ON ati.assigned_task_id = at.id
           WHERE at.assigned_goal_id = $1 ORDER BY ati.interval_date""",
        ag_id,
    )
    return [(r["day"], r["status"]) for r in rows if task_id in (None, r["task_id"])]


async def save(conn, monkeypatch, goal_id, ag_id, start, due, tasks, today=TODAY):
    monkeypatch.setattr(goals, "get_db_pool", lambda: _async(_Pool(conn)))
    request = GoalUpdateRequest(
        assigned_goal_id=ag_id,
        goal=GoalUpdate(id=goal_id, title="Walk more", start_date=start, due_date=due, tasks=tasks),
    )
    return await goals.update_goal(request, user_id=USER, client_today=today)


async def _async(value):
    return value


def test_edit_keeps_done_and_past_days(monkeypatch):
    async def scenario(conn):
        start, due = TODAY - timedelta(days=3), TODAY + timedelta(days=3)
        goal_id, task_id, ag_id = await make_goal(conn, start, due)
        await set_status(conn, ag_id, TODAY - timedelta(days=3), "success")
        await set_status(conn, ag_id, TODAY - timedelta(days=2), "failed")

        response = await save(
            conn, monkeypatch, goal_id, ag_id, start, due,
            [TaskUpdate(id=task_id, title="Walk 30 min", repeat_type=RepeatType.DAILY)],
        )

        assert response.status_code == 200
        days = await days_by_status(conn, ag_id)
        assert days[0] == (TODAY - timedelta(days=3), "success")  # kept
        assert days[1] == (TODAY - timedelta(days=2), "failed")  # kept
        assert len(days) == 7 and len({d for d, _ in days}) == 7  # no duplicates
        assert await conn.fetchval("SELECT title FROM goal WHERE id = $1", goal_id) == "Walk more"
        assert await conn.fetchval("SELECT title FROM task WHERE id = $1", task_id) == "Walk 30 min"

    run(scenario)


def test_schedule_change_only_affects_today_onward(monkeypatch):
    async def scenario(conn):
        start, due = TODAY - timedelta(days=3), TODAY + timedelta(days=3)
        goal_id, task_id, ag_id = await make_goal(conn, start, due)
        await set_status(conn, ag_id, TODAY - timedelta(days=1), "success")
        only_day = TODAY + timedelta(days=2)

        await save(
            conn, monkeypatch, goal_id, ag_id, start, due,
            [TaskUpdate(id=task_id, title="Walk", repeat_type=RepeatType.DATE, date_interval=[only_day])],
        )

        days = await days_by_status(conn, ag_id)
        past = [d for d in days if d[0] < TODAY]
        upcoming = [d for d in days if d[0] >= TODAY]
        assert len(past) == 3 and (TODAY - timedelta(days=1), "success") in past
        assert upcoming == [(only_day, "pending")]

    run(scenario)


def test_removing_a_task_keeps_its_history(monkeypatch):
    async def scenario(conn):
        start, due = TODAY - timedelta(days=2), TODAY + timedelta(days=2)
        goal_id, task_id, ag_id = await make_goal(conn, start, due)
        await set_status(conn, ag_id, TODAY - timedelta(days=2), "success")

        await save(
            conn, monkeypatch, goal_id, ag_id, start, due,
            [TaskUpdate(id=task_id, title="Walk", repeat_type=RepeatType.DAILY, status=Status.DELETED)],
        )

        days = await days_by_status(conn, ag_id)
        assert all(day < TODAY for day, _ in days)  # upcoming days removed
        assert (TODAY - timedelta(days=2), "success") in days  # history kept
        assert await conn.fetchval("SELECT 1 FROM task WHERE id = $1", task_id) == 1

    run(scenario)


def test_new_task_starts_today_not_in_the_past(monkeypatch):
    async def scenario(conn):
        start, due = TODAY - timedelta(days=2), TODAY + timedelta(days=2)
        goal_id, task_id, ag_id = await make_goal(conn, start, due)

        await save(
            conn, monkeypatch, goal_id, ag_id, start, due,
            [
                TaskUpdate(id=task_id, title="Walk", repeat_type=RepeatType.DAILY),
                TaskUpdate(title="Stretch", repeat_type=RepeatType.DAILY),
            ],
        )

        new_task = await conn.fetchval(
            "SELECT id FROM task WHERE goal_id = $1 AND title = 'Stretch'", goal_id
        )
        days = [d for d, _ in await days_by_status(conn, ag_id, new_task)]
        assert days == [TODAY + timedelta(days=i) for i in range(3)]

    run(scenario)


def test_extending_a_finished_goal_makes_it_pending_again(monkeypatch):
    async def scenario(conn):
        start, due = TODAY - timedelta(days=2), TODAY
        goal_id, task_id, ag_id = await make_goal(conn, start, due)
        for i in range(3):
            await set_status(conn, ag_id, start + timedelta(days=i), "success")
        await conn.execute("UPDATE assigned_goal SET status = 'success' WHERE id = $1", ag_id)

        new_due = TODAY + timedelta(days=3)
        await save(
            conn, monkeypatch, goal_id, ag_id, start, new_due,
            [TaskUpdate(id=task_id, title="Walk", repeat_type=RepeatType.DAILY)],
        )

        status = await conn.fetchval("SELECT status::text FROM assigned_goal WHERE id = $1", ag_id)
        assert status == "pending"
        days = await days_by_status(conn, ag_id)
        assert [s for d, s in days if d <= TODAY] == ["success"] * 3
        assert [d for d, s in days if d > TODAY] == [TODAY + timedelta(days=i) for i in (1, 2, 3)]

    run(scenario)


def test_loading_a_half_done_task_lists_it_once(monkeypatch):
    async def scenario(conn):
        start, due = TODAY - timedelta(days=2), TODAY + timedelta(days=2)
        goal_id, task_id, ag_id = await make_goal(conn, start, due)
        await set_status(conn, ag_id, start, "success")
        monkeypatch.setattr(goals, "get_db_pool", lambda: _async(_Pool(conn)))

        response = await goals.get_goal(ag_id, user_id=USER, client_today=TODAY)

        import json
        tasks = json.loads(response.body)["goal"]["tasks"]
        assert [t["id"] for t in tasks] == [task_id]
        assert tasks[0]["status"] == "pending"

    run(scenario)
