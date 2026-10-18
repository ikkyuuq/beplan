from collections import defaultdict
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from auth import get_current_user_id
from database import get_db_pool
from fastapi import APIRouter, Depends, HTTPException
from routers.goals import fail_overdue_tasks
from utils.client_date import get_client_today

router = APIRouter()


class Status(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class Period(str, Enum):
    WEEK = "7d"
    TWO_WEEKS = "14d"
    MONTH = "month"


async def fetch_task_days(conn, user_id: str) -> List[Dict]:
    # One row per scheduled task day (each assigned_task is a single day).
    return await conn.fetch(
        """
        SELECT
            ati.interval_date,
            at.status,
            ag.id AS assigned_goal_id,
            g.title AS goal_title
        FROM public.assigned_task at
        JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
        JOIN public.goal g ON ag.goal_id = g.id
        JOIN public.assigned_task_interval ati ON at.id = ati.assigned_task_id
        WHERE ag.user_id = $1
        """,
        user_id,
    )


def parse_interval_date(interval_date: Any) -> date:
    if isinstance(interval_date, datetime):
        return interval_date.date()
    elif isinstance(interval_date, date):
        return interval_date
    elif isinstance(interval_date, str):
        return datetime.strptime(interval_date, "%Y-%m-%d").date()
    raise ValueError(f"Unsupported date type: {type(interval_date)}")


def period_window(period: Period, today: date) -> Tuple[date, date, date, date]:
    """(start, end, previous_start, previous_end) for a period ending today."""
    if period == Period.MONTH:
        start = today.replace(day=1)
        previous_end = start - timedelta(days=1)
        return start, today, previous_end.replace(day=1), previous_end
    days = 14 if period == Period.TWO_WEEKS else 7
    start = today - timedelta(days=days - 1)
    return start, today, start - timedelta(days=days), start - timedelta(days=1)


def success_rate(success: int, failed: int) -> Optional[float]:
    """Share of finished tasks that succeeded; pending tasks don't count."""
    finished = success + failed
    if finished == 0:
        return None
    return round(success / finished * 100, 2)


def rows_between(rows: List[Dict], start: date, end: date) -> List[Dict]:
    return [r for r in rows if start <= parse_interval_date(r["interval_date"]) <= end]


def count_statuses(rows: List[Dict]) -> Dict[str, int]:
    counts = {Status.SUCCESS.value: 0, Status.FAILED.value: 0, Status.PENDING.value: 0}
    for r in rows:
        if r["status"] in counts:
            counts[r["status"]] += 1
    return counts


def compute_summary(rows: List[Dict], start: date, end: date, today: date) -> Dict:
    counts = count_statuses(rows_between(rows, start, end))
    pending_today = count_statuses(rows_between(rows, today, today))["pending"]
    return {
        "success": counts["success"],
        "failed": counts["failed"],
        "pending_today": pending_today,
        "success_rate": success_rate(counts["success"], counts["failed"]),
    }


def compute_daily(rows: List[Dict], start: date, end: date) -> List[Dict]:
    by_day: Dict[date, List[Dict]] = defaultdict(list)
    for r in rows_between(rows, start, end):
        by_day[parse_interval_date(r["interval_date"])].append(r)
    daily = []
    day = start
    while day <= end:
        daily.append({"date": day.isoformat(), **count_statuses(by_day[day])})
        day += timedelta(days=1)
    return daily


def compute_goal_breakdown(rows: List[Dict], start: date, end: date) -> List[Dict]:
    by_goal: Dict[Any, List[Dict]] = defaultdict(list)
    for r in rows_between(rows, start, end):
        by_goal[r["assigned_goal_id"]].append(r)
    goals = []
    for goal_id, goal_rows in by_goal.items():
        counts = count_statuses(goal_rows)
        goals.append(
            {
                "id": goal_id,
                "title": goal_rows[0]["goal_title"],
                **counts,
                "success_rate": success_rate(counts["success"], counts["failed"]),
            }
        )
    goals.sort(key=lambda g: (-(g["success"] + g["failed"] + g["pending"]), g["title"]))
    return goals


def compute_streak(rows: List[Dict], today: date) -> int:
    """Days in a row, up to today, on which every task succeeded.

    Days without tasks are skipped (rest days). An unfinished today doesn't
    break the streak; it just doesn't count yet.
    """
    statuses_by_day: Dict[date, List[str]] = defaultdict(list)
    for r in rows:
        day = parse_interval_date(r["interval_date"])
        if day <= today:
            statuses_by_day[day].append(r["status"])
    streak = 0
    for day in sorted(statuses_by_day, reverse=True):
        statuses = statuses_by_day[day]
        if all(s == Status.SUCCESS for s in statuses):
            streak += 1
        elif day == today and Status.FAILED not in statuses:
            continue
        else:
            break
    return streak


@router.get("/")
async def read_analysis(
    period: Period = Period.WEEK,
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            await fail_overdue_tasks(conn, user_id, client_today)
            rows = await fetch_task_days(conn, user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    start, end, previous_start, previous_end = period_window(period, client_today)
    previous = count_statuses(rows_between(rows, previous_start, previous_end))
    return {
        "period": period.value,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "summary": {
            **compute_summary(rows, start, end, client_today),
            "previous_success_rate": success_rate(
                previous["success"], previous["failed"]
            ),
        },
        "streak": compute_streak(rows, client_today),
        "daily": compute_daily(rows, start, end),
        "goals": compute_goal_breakdown(rows, start, end),
    }
