from collections import defaultdict
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, HTTPException

from database import get_db_pool

router = APIRouter()


class Status(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class TemplateCategory(str, Enum):
    FITNESS = "fitness"
    HEALTH = "health"
    EDUCATION = "education"
    WORK = "work"
    TRAVEL = "travel"
    PD = "personal_development"
    OTHER = "other"


async def fetch_tasks_with_intervals(conn, user_id: str) -> List[Dict]:
    return await conn.fetch(
        """
        SELECT
            ag.id AS assigned_goal_id,
            at.id AS assigned_task_id,
            at.status AS task_status,
            ati.interval_date,
            t.title AS task_title,
            t.description,
            t.type AS task_type
        FROM public.assigned_task at
        JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
        JOIN public.task t ON at.task_id = t.id
        JOIN public.assigned_task_interval ati ON at.id = ati.assigned_task_id
        WHERE ag.user_id = $1
        """,
        user_id,
    )


async def fetch_assigned_goals(conn, user_id: str) -> List[Dict]:
    return await conn.fetch(
        """
        SELECT 
            ag.id AS assigned_goal_id, 
            ag.status, 
            g.title, 
            g.type
        FROM public.assigned_goal ag
        JOIN public.goal g ON ag.goal_id = g.id
        WHERE ag.user_id = $1
        """,
        user_id,
    )


async def fetch_assigned_tasks(conn, user_id: str) -> List[Dict]:
    return await conn.fetch(
        """
        SELECT 
            at.id AS assigned_task_id, 
            at.status, 
            t.title, 
            t.description,
            ag.id AS assigned_goal_id
        FROM public.assigned_task at
        JOIN public.task t ON at.task_id = t.id
        JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
        WHERE ag.user_id = $1
        """,
        user_id,
    )


async def fetch_templates(conn, user_id: str) -> List[Dict]:
    return await conn.fetch(
        """
        SELECT 
            t.id AS template_id,
            t.category
        FROM public.template t
        JOIN public.assigned_template at ON t.id = at.template_id
        WHERE at.user_id = $1
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


def process_tasks_by_date_and_goal(
    tasks_with_intervals: List[Dict],
) -> Dict[Tuple[date, str], List[str]]:
    tasks_by_date_and_goal = defaultdict(list)
    for row in tasks_with_intervals:
        interval_date = parse_interval_date(row["interval_date"])
        goal_id = row["assigned_goal_id"]
        status = row["task_status"]
        tasks_by_date_and_goal[(interval_date, goal_id)].append(status)
    return tasks_by_date_and_goal


def compute_progress(
    tasks_by_date_and_goal: Dict[Tuple[date, str], List[str]],
    start_date: date,
    end_date: date,
    target_status: Status,
) -> Dict[str, int]:
    progress = {}
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        count = 0
        for (date_key, goal_id), statuses in tasks_by_date_and_goal.items():
            if date_key == current_date and all(s == target_status for s in statuses):
                count += 1
        progress[date_str] = count
        current_date += timedelta(days=1)
    return progress


def compute_weekly_distribution(
    tasks_with_intervals: List[Dict], start_date: date, end_date: date
) -> Dict[str, int]:
    date_counts = defaultdict(int)
    for row in tasks_with_intervals:
        interval_date = parse_interval_date(row["interval_date"])
        if start_date <= interval_date <= end_date:
            date_str = interval_date.strftime("%Y-%m-%d")
            date_counts[date_str] += 1
    distribution = {}
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        distribution[date_str] = date_counts.get(date_str, 0)
        current_date += timedelta(days=1)
    return distribution


def compute_weekly_progress(
    tasks_by_date_and_goal: Dict[Tuple[date, str], List[str]],
) -> Dict[str, int]:
    weekly_progress = {
        day: 0 for day in ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    }
    weekday_names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
    for (date_key, _), statuses in tasks_by_date_and_goal.items():
        if all(s == Status.SUCCESS for s in statuses):
            weekday = weekday_names[date_key.weekday() + 1 % 7]
            weekly_progress[weekday] += 1
    return weekly_progress


async def compute_goals_analysis(
    assigned_goals: List[Dict],
    weekly_progress: Dict,
    last_7_days: Dict,
    last_14_days: Dict,
    this_month: Dict,
    last_month: Dict,
) -> Dict:
    analysis = {
        "total": 0,
        "completed": 0,
        "success": {"count": 0, "list": []},
        "failed": {"count": 0, "list": []},
        "pending": 0,
        "success_rate": 0,
        "weekly_progress_overview": weekly_progress,
        "last_7_days": last_7_days,
        "last_14_days": last_14_days,
        "this_month": this_month,
        "last_month": last_month,
    }
    for row in assigned_goals:
        analysis["total"] += 1
        goal = {
            "id": row["assigned_goal_id"],
            "title": row["title"],
            "type": row["type"],
        }
        status = row["status"]
        if status == Status.SUCCESS:
            analysis["success"]["count"] += 1
            analysis["success"]["list"].append(goal)
            analysis["completed"] += 1
        elif status == Status.FAILED:
            analysis["failed"]["count"] += 1
            analysis["failed"]["list"].append(goal)
            analysis["completed"] += 1
        else:
            analysis["pending"] += 1
    if analysis["total"] > 0:
        analysis["success_rate"] = round(
            (analysis["success"]["count"] / analysis["total"]) * 100, 2
        )
    return analysis


async def compute_tasks_analysis(
    assigned_tasks: List[Dict], weekly_distribution: Dict
) -> Dict:
    analysis = {
        "total": 0,
        "completed": 0,
        "success": {"count": 0, "list": []},
        "failed": {"count": 0, "list": []},
        "pending": 0,
        "success_rate": 0,
        "weekly_distribution": weekly_distribution,
    }
    for row in assigned_tasks:
        analysis["total"] += 1
        task = {
            "id": row["assigned_task_id"],
            "from": row["assigned_goal_id"],
            "title": row["title"],
            "description": row["description"],
        }
        status = row["status"]
        if status == Status.SUCCESS:
            analysis["success"]["count"] += 1
            analysis["success"]["list"].append(task)
            analysis["completed"] += 1
        elif status == Status.FAILED:
            analysis["failed"]["count"] += 1
            analysis["failed"]["list"].append(task)
            analysis["completed"] += 1
        else:
            analysis["pending"] += 1
    if analysis["total"] > 0:
        analysis["success_rate"] = round(
            (analysis["success"]["count"] / analysis["total"]) * 100, 2
        )
    return analysis


async def compute_template_analysis(templates: List[Dict]) -> Dict:
    category_usage = {cat: 0 for cat in TemplateCategory}
    analysis = {
        "total": len(templates),
        "category_usage": category_usage,
    }
    for row in templates:
        category = row["category"].lower()
        if category in analysis["category_usage"]:
            analysis["category_usage"][category] += 1
        else:
            analysis["category_usage"][TemplateCategory.OTHER] += 1
    return analysis


@router.get("")
async def read_analysis(user_id: str):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            today = datetime.now()
            week_ago = today - timedelta(days=6)
            two_week_ago = today - timedelta(days=13)
            start_of_month = today.replace(day=1)
            end_of_month = (start_of_month + timedelta(days=32)).replace(
                day=1
            ) - timedelta(days=1)
            start_of_past_month = (start_of_month - timedelta(days=1)).replace(day=1)
            end_of_past_month = start_of_month - timedelta(days=1)

            tasks_with_intervals = await fetch_tasks_with_intervals(conn, user_id)
            assigned_goals = await fetch_assigned_goals(conn, user_id)
            assigned_tasks = await fetch_assigned_tasks(conn, user_id)
            templates = await fetch_templates(conn, user_id)

            tasks_by_date_and_goal = process_tasks_by_date_and_goal(
                tasks_with_intervals
            )
            weekly_progress = compute_weekly_progress(tasks_by_date_and_goal)

            last_week_progress = compute_progress(
                tasks_by_date_and_goal, week_ago.date(), today.date(), Status.SUCCESS
            )
            last_two_weeks_progress = compute_progress(
                tasks_by_date_and_goal,
                two_week_ago.date(),
                today.date(),
                Status.SUCCESS,
            )
            this_month_progress = compute_progress(
                tasks_by_date_and_goal,
                start_of_month.date(),
                end_of_month.date(),
                Status.SUCCESS,
            )
            last_month_progress = compute_progress(
                tasks_by_date_and_goal,
                start_of_past_month.date(),
                end_of_past_month.date(),
                Status.SUCCESS,
            )

            tasks_weekly_distribution = compute_weekly_distribution(
                tasks_with_intervals, week_ago.date(), today.date()
            )

            goals_analysis = await compute_goals_analysis(
                assigned_goals,
                weekly_progress,
                last_week_progress,
                last_two_weeks_progress,
                this_month_progress,
                last_month_progress,
            )
            tasks_analysis = await compute_tasks_analysis(
                assigned_tasks, tasks_weekly_distribution
            )
            template_analysis = await compute_template_analysis(templates)

            return {
                "goals": goals_analysis,
                "tasks": tasks_analysis,
                "templates": template_analysis,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
