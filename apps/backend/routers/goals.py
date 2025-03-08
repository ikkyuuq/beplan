import logging
from datetime import date
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from const import types as T
from database import get_db_pool
from utils import date_calculation, goal_creation

load_dotenv()


router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TaskUpdate(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    repeat_type: Optional[T.RepeatType] = None
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None
    status: Optional[T.Status] = None


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


@router.post("/goal")
async def create_goal(req: T.GoalCreateRequest):
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await goal_creation.Create(conn, req, req.user_id)
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
                if task.repeat_type == T.RepeatType.DAILY:
                    interval_date = date_calculation.get_daily_range(
                        req.goal.start_date, req.goal.due_date
                    )
                elif task.repeat_type == T.RepeatType.WEEKLY:
                    if not task.week_interval:
                        raise HTTPException(400, detail="Week interval is required")
                    else:
                        interval_date = date_calculation.get_weekly_range(
                            req.goal.start_date,
                            req.goal.due_date,
                            task.week_interval,
                        )
                elif (
                    task.repeat_type == T.RepeatType.MONTHLY
                    or task.repeat_type == T.RepeatType.DATE
                ):
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


@router.get("/goal/{assigned_goal_id}")
async def get_goal(assigned_goal_id: int):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:

            goal_data = await conn.fetchrow(
                """
                SELECT g.id, g.title, g.type, ag.start_date, ag.due_date
                FROM goal g
                JOIN assigned_goal ag ON g.id = ag.goal_id
                WHERE ag.id = $1
                """,
                assigned_goal_id,
            )

            if not goal_data:
                raise HTTPException(status_code=404, detail="Goal not found")

            tasks_data = await conn.fetch(
                """
                SELECT DISTINCT t.id, t.title, t.description, t.type as repeat_type, t.interval as week_interval, at.status
                FROM task t
                JOIN assigned_task at ON t.id = at.task_id
                WHERE at.assigned_goal_id = $1
                """,
                assigned_goal_id,
            )

            tasks = []
            for task in tasks_data:
                tasks.append(
                    {
                        "id": task["id"],
                        "title": task["title"],
                        "description": task["description"],
                        "repeat_type": task["repeat_type"],
                        "date_interval": [],
                        "week_interval": task["week_interval"],
                        "status": task["status"],
                    }
                )

            response = {
                "goal": {
                    "id": goal_data["id"],
                    "title": goal_data["title"],
                    "type": goal_data["type"],
                    "start_date": goal_data["start_date"].isoformat(),
                    "due_date": goal_data["due_date"].isoformat(),
                    "tasks": tasks,
                }
            }

            return JSONResponse(content=response)

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JSONResponse(
                content={"error": f"Unexpected error: {str(e)}"}, status_code=500
            )
