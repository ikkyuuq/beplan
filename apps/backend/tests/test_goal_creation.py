import asyncio
from datetime import date
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.const.types import Goal, GoalCreateRequest, RepeatType, Task
from backend.utils.goal_creation import Create, get_interval_dates
from backend.routers.goals import check_goal_status


def test_get_interval_dates_rejects_weekly_task_without_days():
    task = Task(title="Workout", repeat_type=RepeatType.WEEKLY, week_interval=[])

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            get_interval_dates(task, date(2026, 10, 5), date(2026, 10, 11))
        )

    assert error.value.status_code == 400
    assert error.value.detail == "Week interval is required"


def test_get_interval_dates_returns_explicit_dates_for_date_repeat():
    dates = [date(2026, 10, 5), date(2026, 10, 9)]
    task = Task(
        title="Appointments",
        repeat_type=RepeatType.DATE,
        date_interval=dates,
    )

    assert asyncio.run(
        get_interval_dates(task, date(2026, 10, 1), date(2026, 10, 10))
    ) == dates


def test_create_persists_daily_task_for_each_day_inclusive():
    conn = AsyncMock()
    ids = iter([10, 20, 30, 40, 41, 42])

    async def fetchrow(*_args):
        return {"id": next(ids)}

    conn.fetchrow.side_effect = fetchrow
    req = GoalCreateRequest(
        user_id="user-1",
        goal=Goal(
            title="Walk",
            start_date=date(2026, 10, 5),
            due_date=date(2026, 10, 7),
            tasks=[Task(title="Daily walk", repeat_type=RepeatType.DAILY)],
        ),
    )

    asyncio.run(Create(conn, req, req.user_id))

    inserted_intervals = [
        call.args for call in conn.execute.await_args_list
    ]
    assert [args[-1] for args in inserted_intervals] == [
        date(2026, 10, 5),
        date(2026, 10, 6),
        date(2026, 10, 7),
    ]
    assert [args[-2] for args in inserted_intervals] == [40, 41, 42]


def run_goal_status(total, completed, pending):
    conn = AsyncMock()
    conn.fetchrow.return_value = {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
    }
    asyncio.run(check_goal_status(conn, assigned_goal_id=30))
    return conn


def test_goal_status_stays_pending_while_any_task_is_pending():
    # Even a guaranteed majority does not settle the goal early.
    conn = run_goal_status(total=4, completed=3, pending=1)

    conn.execute.assert_not_awaited()


def test_goal_status_marks_success_when_settled_with_at_least_half_succeeded():
    conn = run_goal_status(total=4, completed=2, pending=0)

    conn.execute.assert_awaited_once()
    assert conn.execute.await_args.args[-2:] == (30, "success")


def test_goal_status_marks_failed_when_settled_with_less_than_half_succeeded():
    conn = run_goal_status(total=5, completed=2, pending=0)

    conn.execute.assert_awaited_once()
    assert conn.execute.await_args.args[-2:] == (30, "failed")


def test_goal_status_does_not_touch_remaining_tasks():
    conn = run_goal_status(total=4, completed=0, pending=0)

    sql = conn.execute.await_args.args[0]
    assert "assigned_goal" in sql and "assigned_task" not in sql


def test_goal_status_ignores_goal_without_tasks():
    conn = run_goal_status(total=0, completed=None, pending=None)

    conn.execute.assert_not_awaited()
