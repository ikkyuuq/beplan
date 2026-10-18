import asyncio
from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.routers.analysis import (
    Period,
    compute_daily,
    compute_goal_breakdown,
    compute_streak,
    compute_summary,
    fetch_task_days,
    parse_interval_date,
    period_window,
    success_rate,
)


def row(day, status, goal_id=1, title="Run"):
    return {
        "interval_date": day,
        "status": status,
        "assigned_goal_id": goal_id,
        "goal_title": title,
    }


def test_parse_interval_date_accepts_date_datetime_and_iso_string():
    day = date(2026, 10, 4)

    assert parse_interval_date(day) == day
    assert parse_interval_date(datetime(2026, 10, 4, 12, 30)) == day
    assert parse_interval_date("2026-10-04") == day


def test_parse_interval_date_rejects_unsupported_types():
    with pytest.raises(ValueError, match="Unsupported date type"):
        parse_interval_date(123)


def test_period_window_7d_ends_today_and_compares_with_the_week_before():
    today = date(2026, 10, 18)

    assert period_window(Period.WEEK, today) == (
        date(2026, 10, 12),
        today,
        date(2026, 10, 5),
        date(2026, 10, 11),
    )


def test_period_window_14d():
    today = date(2026, 10, 18)

    assert period_window(Period.TWO_WEEKS, today) == (
        date(2026, 10, 5),
        today,
        date(2026, 9, 21),
        date(2026, 10, 4),
    )


def test_period_window_month_runs_from_the_first_and_compares_with_last_month():
    today = date(2026, 3, 18)

    assert period_window(Period.MONTH, today) == (
        date(2026, 3, 1),
        today,
        date(2026, 2, 1),
        date(2026, 2, 28),
    )


def test_success_rate_ignores_pending_and_is_none_when_nothing_finished():
    assert success_rate(13, 12) == 52.0
    assert success_rate(1, 2) == 33.33
    assert success_rate(0, 0) is None


def test_summary_counts_finished_tasks_in_window_and_pending_today():
    today = date(2026, 10, 18)
    rows = [
        row(date(2026, 10, 4), "success"),  # before window
        row(date(2026, 10, 12), "success"),
        row(date(2026, 10, 13), "failed"),
        row(today, "success"),
        row(today, "pending"),
        row(today, "pending"),
        row(date(2026, 10, 19), "pending"),  # future
    ]

    assert compute_summary(rows, date(2026, 10, 12), today, today) == {
        "success": 2,
        "failed": 1,
        "pending_today": 2,
        "success_rate": 66.67,
    }


def test_daily_has_one_row_per_day_including_empty_days():
    rows = [
        row(date(2026, 10, 12), "success"),
        row(date(2026, 10, 12), "failed"),
        row(date(2026, 10, 14), "pending"),
        row(date(2026, 10, 15), "success"),  # outside
    ]

    assert compute_daily(rows, date(2026, 10, 12), date(2026, 10, 14)) == [
        {"date": "2026-10-12", "success": 1, "failed": 1, "pending": 0},
        {"date": "2026-10-13", "success": 0, "failed": 0, "pending": 0},
        {"date": "2026-10-14", "success": 0, "failed": 0, "pending": 1},
    ]


def test_goal_breakdown_lists_goals_with_tasks_in_window_busiest_first():
    start, end = date(2026, 10, 12), date(2026, 10, 18)
    rows = [
        row(date(2026, 10, 12), "success", 1, "Run"),
        row(date(2026, 10, 13), "failed", 1, "Run"),
        row(date(2026, 10, 12), "success", 2, "Read"),
        row(date(2026, 10, 13), "success", 2, "Read"),
        row(date(2026, 10, 14), "pending", 2, "Read"),
        row(date(2026, 10, 1), "success", 3, "Old"),  # outside
    ]

    assert compute_goal_breakdown(rows, start, end) == [
        {
            "id": 2,
            "title": "Read",
            "success": 2,
            "failed": 0,
            "pending": 1,
            "success_rate": 100.0,
        },
        {
            "id": 1,
            "title": "Run",
            "success": 1,
            "failed": 1,
            "pending": 0,
            "success_rate": 50.0,
        },
    ]


def test_streak_counts_perfect_days_and_skips_rest_days():
    today = date(2026, 10, 18)
    rows = [
        row(date(2026, 10, 13), "failed"),
        row(date(2026, 10, 14), "success"),
        # 10-15 has no tasks: a rest day neither breaks nor adds
        row(date(2026, 10, 16), "success"),
        row(date(2026, 10, 16), "success"),
        row(date(2026, 10, 17), "success"),
        row(today, "success"),
    ]

    assert compute_streak(rows, today) == 4


def test_streak_does_not_break_on_an_unfinished_today():
    today = date(2026, 10, 18)
    rows = [
        row(date(2026, 10, 17), "success"),
        row(today, "success"),
        row(today, "pending"),
    ]

    assert compute_streak(rows, today) == 1


def test_streak_is_zero_after_a_failed_day():
    today = date(2026, 10, 18)
    rows = [row(date(2026, 10, 16), "success"), row(today, "failed")]

    assert compute_streak(rows, today) == 0


def test_fetch_task_days_passes_user_id_to_database():
    conn = SimpleNamespace(fetch=AsyncMock(return_value=[]))

    assert asyncio.run(fetch_task_days(conn, "user-1")) == []
    conn.fetch.assert_awaited_once()
    assert conn.fetch.await_args.args[-1] == "user-1"
