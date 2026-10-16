import asyncio
from datetime import date, datetime

import pytest

from backend.routers.analysis import (
    Status,
    compute_goals_analysis,
    compute_progress,
    compute_template_analysis,
    compute_weekly_distribution,
    compute_weekly_progress,
    parse_interval_date,
    process_tasks_by_date_and_goal,
)


def test_parse_interval_date_accepts_date_datetime_and_iso_string():
    day = date(2026, 10, 4)

    assert parse_interval_date(day) == day
    assert parse_interval_date(datetime(2026, 10, 4, 12, 30)) == day
    assert parse_interval_date("2026-10-04") == day


def test_compute_progress_counts_only_goals_whose_tasks_all_match():
    day = date(2026, 10, 4)
    tasks = process_tasks_by_date_and_goal(
        [
            {"interval_date": day, "assigned_goal_id": 1, "task_status": "success"},
            {"interval_date": day, "assigned_goal_id": 1, "task_status": "success"},
            {"interval_date": day, "assigned_goal_id": 2, "task_status": "success"},
            {"interval_date": day, "assigned_goal_id": 2, "task_status": "failed"},
        ]
    )

    assert compute_progress(tasks, day, day, Status.SUCCESS) == {
        "2026-10-04": 1
    }


def test_weekly_progress_maps_all_days_sunday_first():
    # Python weekday values start Monday; analysis output starts Sunday.
    dates = [date(2026, 10, 5 + offset) for offset in range(7)]
    tasks = {
        (day, str(index)): [Status.SUCCESS]
        for index, day in enumerate(dates)
    }

    assert compute_weekly_progress(tasks) == {
        "sun": 1,
        "mon": 1,
        "tue": 1,
        "wed": 1,
        "thu": 1,
        "fri": 1,
        "sat": 1,
    }


def test_weekly_distribution_counts_interval_dates_and_fills_missing_days():
    start = date(2026, 10, 4)
    end = date(2026, 10, 6)

    assert compute_weekly_distribution(
        [
            {"interval_date": "2026-10-04"},
            {"interval_date": date(2026, 10, 4)},
            {"interval_date": datetime(2026, 10, 6, 8)},
            {"interval_date": date(2026, 10, 7)},
        ],
        start,
        end,
    ) == {"2026-10-04": 2, "2026-10-05": 0, "2026-10-06": 1}


def test_goals_analysis_reports_counts_and_success_rate():
    analysis = asyncio.run(
        compute_goals_analysis(
            [
                {
                    "assigned_goal_id": 1,
                    "title": "Run",
                    "type": "custom goal",
                    "status": Status.SUCCESS,
                },
                {
                    "assigned_goal_id": 2,
                    "title": "Read",
                    "type": "custom goal",
                    "status": Status.FAILED,
                },
                {
                    "assigned_goal_id": 3,
                    "title": "Learn",
                    "type": "custom goal",
                    "status": Status.PENDING,
                },
            ],
            {},
            {},
            {},
            {},
            {},
        )
    )

    assert analysis["total"] == 3
    assert analysis["completed"] == 2
    assert analysis["success"]["count"] == 1
    assert analysis["failed"]["count"] == 1
    assert analysis["pending"] == 1
    assert analysis["success_rate"] == 33.33


def test_template_analysis_counts_unknown_categories_as_all():
    analysis = asyncio.run(
        compute_template_analysis(
            [{"category": "health"}, {"category": "custom-category"}]
        )
    )

    assert analysis["total"] == 2
    assert analysis["category_usage"]["health"] == 1
    assert analysis["category_usage"]["all"] == 1


def test_parse_interval_date_rejects_unsupported_types():
    with pytest.raises(ValueError, match="Unsupported date type"):
        parse_interval_date(123)
