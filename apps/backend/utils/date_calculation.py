from datetime import datetime, timedelta
from typing import List


def get_daily_range(start_date: str, due_date: str):
    interval_date = []
    current_date = datetime.strptime(start_date, "%Y-%m-%d")

    while current_date <= datetime.strptime(due_date, "%Y-%m-%d"):
        interval_date.append(current_date.date())
        current_date += timedelta(days=1)

    return interval_date


def get_weekly_range(start_date: str, due_date: str, interval_date_in_week: List[int]):
    interval_date = []
    current_date = datetime.strptime(start_date, "%Y-%m-%d")

    while current_date <= datetime.strptime(due_date, "%Y-%m-%d"):
        if (current_date.weekday() + 1) in interval_date_in_week:
            interval_date.append(current_date.date())
        current_date += timedelta(days=1)

    return interval_date
