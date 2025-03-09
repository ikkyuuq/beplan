from datetime import date

from asyncpg import Connection
from fastapi import HTTPException

from const import types as T
from utils import date_calculation


async def get_interval_dates(task: T.Task, start_date: date, due_date: date):
    """Determine the list of interval dates based on the task repeat type."""
    if task.repeat_type == T.RepeatType.DAILY:
        return date_calculation.get_daily_range(start_date, due_date)
    elif task.repeat_type == T.RepeatType.WEEKLY:
        if not task.week_interval:
            raise HTTPException(400, detail="Week interval is required")
        return date_calculation.get_weekly_range(
            start_date, due_date, task.week_interval
        )
    elif (
        task.repeat_type == T.RepeatType.MONTHLY
        or task.repeat_type == T.RepeatType.DATE
    ):
        if not task.date_interval:
            raise HTTPException(400, detail="Monthly interval is required")
        return task.date_interval
    else:
        raise HTTPException(
            400, detail="Invalid task type, must be daily, weekly, or monthly"
        )


async def Create(conn: Connection, req: T.GoalCreateRequest, user_id: str):
    """Creates a goal along with its tasks, assigned goal, and assigned task intervals."""
    goal_row = await conn.fetchrow(
        """
        INSERT INTO goal (title, type)
        VALUES ($1, $2)
        RETURNING id
        """,
        req.goal.title,
        req.goal.type,
    )
    if not goal_row:
        raise ValueError("Unable to add goal")
    goal_id = goal_row["id"]

    task_ids = []
    for task in req.goal.tasks:
        task_row = await conn.fetchrow(
            """
            INSERT INTO task (title, description, goal_id, interval, type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            task.title,
            task.description,
            goal_id,
            task.week_interval if task.week_interval else None,
            task.repeat_type,
        )
        task_ids.append(task_row["id"])

    assigned_goal_row = await conn.fetchrow(
        """
        INSERT INTO assigned_goal (start_date, due_date, user_id, goal_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        """,
        req.goal.start_date,
        req.goal.due_date,
        user_id,
        goal_id,
    )
    assigned_goal_id = assigned_goal_row["id"]

    for task, task_id in zip(req.goal.tasks, task_ids):
        interval_dates = await get_interval_dates(
            task, req.goal.start_date, req.goal.due_date
        )
        for interval_date in interval_dates:
            assigned_task_row = await conn.fetchrow(
                """
                INSERT INTO assigned_task (assigned_goal_id, task_id)
                VALUES ($1, $2)
                RETURNING id
                """,
                assigned_goal_id,
                task_id,
            )
            assigned_task_id = assigned_task_row["id"]
            await conn.execute(
                """
                INSERT INTO assigned_task_interval (assigned_task_id, interval_date)
                VALUES ($1, $2)
                """,
                assigned_task_id,
                interval_date,
            )
