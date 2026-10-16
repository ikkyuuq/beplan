from datetime import date

from backend.utils.date_calculation import get_daily_range, get_weekly_range


def test_daily_range_includes_both_endpoints():
    start = date(2026, 10, 5)
    due = date(2026, 10, 7)

    assert get_daily_range(start, due) == [
        date(2026, 10, 5),
        date(2026, 10, 6),
        date(2026, 10, 7),
    ]


def test_daily_range_includes_single_day():
    day = date(2026, 10, 5)

    assert get_daily_range(day, day) == [day]


def test_weekly_range_uses_sunday_zero_and_includes_boundaries():
    start = date(2026, 10, 4)
    due = date(2026, 10, 10)

    assert get_weekly_range(start, due, [0, 3, 6]) == [
        date(2026, 10, 4),
        date(2026, 10, 7),
        date(2026, 10, 10),
    ]


def test_ranges_are_empty_when_start_is_after_due():
    start = date(2026, 10, 7)
    due = date(2026, 10, 5)

    assert get_daily_range(start, due) == []
    assert get_weekly_range(start, due, [0, 1, 2, 3, 4, 5, 6]) == []


def test_weekly_range_ignores_days_not_selected():
    start = date(2026, 10, 4)
    due = date(2026, 10, 10)

    assert get_weekly_range(start, due, []) == []
