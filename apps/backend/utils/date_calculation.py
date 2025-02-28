from datetime import date, datetime, timedelta
from typing import List


def get_daily_range(start_date: date, due_date: date):
    interval_date = []
    current_date = start_date

    while current_date <= due_date:
        interval_date.append(current_date)
        current_date += timedelta(days=1)

    return interval_date


def get_weekly_range(
    start_date: date, due_date: date, interval_date_in_week: List[int]
):
    interval_date = []
    current_date = start_date

    while current_date <= due_date:
        if (current_date.weekday() + 1) in interval_date_in_week:
            interval_date.append(current_date)
        current_date += timedelta(days=1)

    return interval_date
