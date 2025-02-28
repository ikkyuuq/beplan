import logging
from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from database import get_db_pool
from utils import date_calculation

load_dotenv()


router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RepeatMode(str, Enum):
    date = "date"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class Status(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class TaskType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Task(BaseModel):
    title: str
    description: Optional[str] = None
    repeat_type: RepeatMode
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None


class Goal(BaseModel):
    title: str
    type: str = Field(default="custom goal")
    start_date: date
    due_date: date
    tasks: List[Task]


class TaskUpdate(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    repeat_type: Optional[RepeatMode] = None
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None
    status: Optional[Status] = None


class GoalUpdate(BaseModel):
    id: int
    title: str
    type: str = Field(default="custom goal")
    start_date: date
    due_date: date
    tasks: List[TaskUpdate]


class GoalUpdateRequest(BaseModel):
    user_id: str
    assigned_goal_id: int
    goal: GoalUpdate


class GoalCreateRequest(BaseModel):
    user_id: str
    goal: Goal


@router.post("/goal")
async def create_goal(req: GoalCreateRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            goal_id = await conn.fetchrow(
                """
                INSERT INTO goal (title, type)
                VALUES ($1, $2)
                RETURNING id
                """,
                req.goal.title,
                req.goal.type,
            )

            if not goal_id:
                raise ValueError("Unable to add goal")

            task_ids = []

            for task in req.goal.tasks:
                task_id = await conn.fetchrow(
                    """
                    INSERT INTO task (title, description, goal_id, interval)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                    """,
                    task.title,
                    task.description,
                    goal_id["id"],
                    task.week_interval if task.week_interval else None,
                )

                task_ids.append(task_id["id"])

            assigned_goal_id = await conn.fetchrow(
                """
                INSERT INTO assigned_goal (start_date, due_date, user_id, goal_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                """,
                req.goal.start_date,
                req.goal.due_date,
                req.user_id,
                goal_id["id"],
            )

            for task_id, task in zip(task_ids, req.goal.tasks):
                if task.repeat_type == TaskType.DAILY:
                    interval_date = date_calculation.get_daily_range(
                        req.goal.start_date, req.goal.due_date
                    )
                elif task.repeat_type == TaskType.WEEKLY:
                    if not task.week_interval:
                        raise HTTPException(400, detail="Week interval is required")
                    else:
                        interval_date = date_calculation.get_weekly_range(
                            req.goal.start_date, req.goal.due_date, task.week_interval
                        )
                elif task.repeat_type == TaskType.MONTHLY:
                    if not task.date_interval:
                        raise HTTPException(400, detail="Monthly interval is required")
                    else:
                        interval_date = task.date_interval
                else:
                    raise HTTPException(
                        400,
                        detail="Invalid task type, must be daily, weekly, or monthly",
                    )

                for date in interval_date:
                    assigned_task_id = await conn.fetchrow(
                        """
                        INSERT INTO assigned_task (assigned_goal_id, task_id)
                        VALUES ($1, $2)
                        RETURNING id
                        """,
                        assigned_goal_id["id"],
                        task_id,
                    )

                    await conn.execute(
                        """
                        INSERT INTO assigned_task_interval (assigned_task_id, interval_date)
                        VALUES ($1, $2)
                        """,
                        assigned_task_id["id"],
                        date,
                    )

            return JSONResponse(
                content={
                    "status": "success",
                    "message": "Goal with tasks created successfully",
                }
            )

        except ValueError as e:
            logger.error(f"ValueError: {str(e)}")
            return JSONResponse(content={"error": str(e)}, status_code=400)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JSONResponse(
                content={"error": f"Unexpected error: {str(e)}"}, status_code=500
            )


@router.put("/goal")
async def update_goal(req: GoalUpdateRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            await conn.execute(
                """
                UPDATE goal
                SET title = $1, type = $2, updated_at = NOW()
                WHERE id = $3
                """,
                req.goal.title,
                req.goal.type,
                req.goal.id,
            )

            await conn.execute(
                """
                UPDATE assigned_goal
                SET start_date = $1, due_date = $2, updated_at = NOW()
                WHERE goal_id = $3
                AND user_id = $4
                AND id = $5
                """,
                req.goal.start_date,
                req.goal.due_date,
                req.goal.id,
                req.user_id,
                req.assigned_goal_id,
            )

            for task in req.goal.tasks:
                # Delete task if status is deleted
                if task.status == Status.DELETED:
                    await conn.execute(
                        """
                        DELETE FROM task
                        WHERE id = $1
                        """,
                        task.id,
                    )

            for task in req.goal.tasks:
                if task.status != Status.DELETED:
                    await conn.execute(
                        """
                        UPDATE task
                        SET title = $1, description = $2, type = $3, interval = $4, updated_at = NOW()
                        WHERE id = $5 AND goal_id = $6
                        """,
                        task.title,
                        task.description,
                        task.repeat_type,
                        task.week_interval if task.week_interval else None,
                        task.id,
                        req.goal.id,
                    )

            # Delete all previous interval dates
            await conn.execute(
                """
                DELETE FROM assigned_task_interval
                WHERE assigned_task_id IN (
                    SELECT id FROM assigned_task WHERE assigned_goal_id IN (
                        SELECT id FROM assigned_goal WHERE goal_id = $1 AND user_id = $2
                    )
                )
                """,
                req.goal.id,
                req.user_id,
            )

            # Insert new interval dates
            for task in req.goal.tasks:
                # Get all existing assigned task ids
                assigned_task_ids = await conn.fetch(
                    """
                    SELECT id FROM assigned_task 
                    WHERE task_id = $1
                    AND status = 'pending'
                    AND assigned_goal_id 
                    IN (SELECT id FROM assigned_goal WHERE goal_id = $2 AND user_id = $3)
                    """,
                    task.id,
                    req.goal.id,
                    req.user_id,
                )

                # Re-Calculate interval dates from new start date to due date
                if task.repeat_type == TaskType.DAILY:
                    interval_date = date_calculation.get_daily_range(
                        req.goal.start_date, req.goal.due_date
                    )
                elif task.repeat_type == TaskType.WEEKLY:
                    if not task.week_interval:
                        raise HTTPException(400, detail="Week interval is required")
                    else:
                        interval_date = date_calculation.get_weekly_range(
                            req.goal.start_date,
                            req.goal.due_date,
                            task.week_interval,
                        )
                elif task.repeat_type == TaskType.MONTHLY:
                    if not task.date_interval:
                        raise HTTPException(400, detail="Monthly interval is required")
                    else:
                        interval_date = task.date_interval
                else:
                    raise HTTPException(
                        400,
                        detail="Invalid task type, must be daily, weekly, or monthly",
                    )

                # Loop through assigned task ids and insert interval dates
                for assigned_task_id in assigned_task_ids:
                    for date in interval_date:
                        await conn.execute(
                            """
                            INSERT INTO assigned_task_interval (assigned_task_id, interval_date)
                            VALUES ($1, $2)
                            """,
                            assigned_task_id["id"],
                            date,
                        )

            return JSONResponse(
                content={
                    "status": "success",
                    "message": "Goal and related tasks updated successfully",
                }
            )

        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JSONResponse(
                content={"error": f"Unexpected error: {str(e)}"}, status_code=500
            )
