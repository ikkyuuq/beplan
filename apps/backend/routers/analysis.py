from datetime import date, datetime, timedelta
from enum import Enum
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from database import get_db_pool

router = APIRouter()


class Status(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    PENDING = "pending"


class TemplateCategory(str, Enum):
    FITNESS = "fitness"
    HEALTH = "health"
    EDUCATION = "education"
    WORK = "work"
    HOBBY = "hobby"
    PD = "personal_development"
    OTHER = "other"


async def task_list(user_id: str, target_date: date, conn):
    tasks_rec = await conn.fetch(
        """
        SELECT
            ag.id AS assigned_goal_id,
            at.id AS assigned_task_id,
            at.status,
            ati.interval_date,
            t.title AS task_title,
            t.description,
            t.type AS task_type
        FROM public.assigned_task at
        JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
        JOIN public.task t ON at.task_id = t.id
        JOIN public.assigned_task_interval ati ON at.id = ati.assigned_task_id
        WHERE ag.user_id = $1
          AND ati.interval_date = $2
        """,
        user_id,
        target_date,
    )

    tasks_dict = {}
    for row in tasks_rec:
        key = row["assigned_goal_id"]
        tasks_dict.setdefault(key, []).append(
            {
                "id": row["assigned_task_id"],
                "title": row["task_title"],
                "description": row["description"],
                "status": row["status"],
                "type": row["task_type"],
            }
        )
    return tasks_dict


async def compute_weekly_progress(
    conn, user_id: str, week_ago: datetime, today: datetime
):
    weekly_progress = {
        (week_ago + timedelta(days=i)).strftime("%Y-%m-%d"): 0
        for i in range((today - week_ago).days + 1)
    }

    for date_str in weekly_progress:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        tasks = await task_list(user_id, target_date, conn)
        for tasks_list in tasks.values():
            if tasks_list and all(
                task["status"] == Status.COMPLETED for task in tasks_list
            ):
                weekly_progress[date_str] += 1

    return weekly_progress


async def compute_weekly_tasks_distribution(
    conn, user_id: str, week_ago: datetime, today: datetime
):
    distribution = {
        (week_ago + timedelta(days=i)).strftime("%Y-%m-%d"): 0
        for i in range((today - week_ago).days + 1)
    }

    for date_str in distribution:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        tasks_count_rec = await conn.fetch(
            """
            SELECT COUNT(*) as count
            FROM public.assigned_task_interval ati
            JOIN public.assigned_task at ON ati.assigned_task_id = at.id
            JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
            WHERE ag.user_id = $1
              AND ati.interval_date = $2
            """,
            user_id,
            target_date,
        )
        if tasks_count_rec:
            distribution[date_str] = tasks_count_rec[0]["count"]
    return distribution


async def compute_goals_analysis(conn, user_id: str, goals_weekly_progress: Dict):
    goals_analysis = {
        "total": 0,
        "completed": {"count": 0, "data": []},
        "failed": {"count": 0, "data": []},
        "pending": 0,
        "success_rate": 0,
        "weekly_progress": goals_weekly_progress,
    }

    assigned_goals_rec = await conn.fetch(
        """
        SELECT 
            ag.id AS assigned_goal_id, 
            ag.status, 
            g.id AS goal_id, 
            g.title, 
            g.type
        FROM public.assigned_goal ag
        JOIN public.goal g ON ag.goal_id = g.id
        WHERE ag.user_id = $1
        """,
        user_id,
    )

    for row in assigned_goals_rec:
        goals_analysis["total"] += 1
        goal_obj = {
            "id": row["assigned_goal_id"],
            "title": row["title"],
            "type": row["type"],
        }
        if row["status"] == Status.COMPLETED:
            goals_analysis["completed"]["count"] += 1
            goals_analysis["completed"]["data"].append(goal_obj)
        elif row["status"] == Status.FAILED:
            goals_analysis["failed"]["count"] += 1
            goals_analysis["failed"]["data"].append(goal_obj)
        else:
            goals_analysis["pending"] += 1

    if goals_analysis["total"]:
        goals_analysis["success_rate"] = (
            goals_analysis["completed"]["count"] / goals_analysis["total"]
        ) * 100

    return goals_analysis


async def compute_tasks_analysis(conn, user_id: str, tasks_weekly_distribution: Dict):
    tasks_analysis = {
        "total": 0,
        "completed": {"count": 0, "data": []},
        "failed": {"count": 0, "data": []},
        "pending": 0,
        "success_rate": 0,
        "weekly_distribution": tasks_weekly_distribution,
    }

    assigned_tasks_rec = await conn.fetch(
        """
        SELECT 
            ag.id AS assigned_goal_id,
            at.id AS assigned_task_id, 
            at.status, 
            t.title, 
            t.description,
            t.type
        FROM public.assigned_task at
        JOIN public.task t ON at.task_id = t.id
        JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
        WHERE ag.user_id = $1
        """,
        user_id,
    )

    for row in assigned_tasks_rec:
        tasks_analysis["total"] += 1
        task_obj = {
            "id": row["assigned_task_id"],
            "from": row["assigned_goal_id"],
            "title": row["title"],
            "description": row["description"],
            "type": row["type"],
        }
        if row["status"] == Status.COMPLETED:
            tasks_analysis["completed"]["count"] += 1
            tasks_analysis["completed"]["data"].append(task_obj)
        elif row["status"] == Status.FAILED:
            tasks_analysis["failed"]["count"] += 1
            tasks_analysis["failed"]["data"].append(task_obj)
        else:
            tasks_analysis["pending"] += 1

    if tasks_analysis["total"]:
        tasks_analysis["success_rate"] = (
            tasks_analysis["completed"]["count"] / tasks_analysis["total"]
        ) * 100

    return tasks_analysis


async def compute_template_analysis(conn, user_id: str):
    category_usage = {
        TemplateCategory.FITNESS: 0,
        TemplateCategory.HEALTH: 0,
        TemplateCategory.EDUCATION: 0,
        TemplateCategory.WORK: 0,
        TemplateCategory.HOBBY: 0,
        TemplateCategory.PD: 0,
        TemplateCategory.OTHER: 0,
    }
    templates_analysis = {
        "total": 0,
        "category_usage": category_usage,
    }

    templates_rec = await conn.fetch(
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

    for row in templates_rec:
        templates_analysis["total"] += 1
        category = row["category"]
        if category in templates_analysis["category_usage"]:
            templates_analysis["category_usage"][category] += 1
        else:
            templates_analysis["category_usage"][category] = 1

    return templates_analysis


@router.get("")
async def read_analysis(user_id: str):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            week_ago = datetime.now() - timedelta(days=6)
            today = datetime.now()

            goals_weekly_progress = await compute_weekly_progress(
                conn, user_id, week_ago, today
            )
            tasks_weekly_distribution = await compute_weekly_tasks_distribution(
                conn, user_id, week_ago, today
            )

            goals_analysis = await compute_goals_analysis(
                conn, user_id, goals_weekly_progress
            )
            tasks_analysis = await compute_tasks_analysis(
                conn, user_id, tasks_weekly_distribution
            )
            template_analysis = await compute_template_analysis(conn, user_id)

            return {
                "goals": goals_analysis,
                "tasks": tasks_analysis,
                "templates": template_analysis,
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
