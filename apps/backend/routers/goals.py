import logging
from datetime import date
from typing import List, Optional

from const import types as T
from database import get_db_pool
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from utils import date_calculation, goal_creation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TaskUpdate(BaseModel):
    id: Optional[int] = None
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


class FetchTask(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: T.Status


class FetchGoal(BaseModel):
    id: int
    title: str
    type: str
    status: T.Status
    start_date: date
    due_date: date
    tasks: List[FetchTask] = []


class GoalUpdateRequest(BaseModel):
    user_id: str
    assigned_goal_id: int
    goal: GoalUpdate


class TaskUpdateRequest(BaseModel):
    to: T.Status
    user_id: str
    assigned_task_id: List[int]


router = APIRouter()


@router.post("/create")
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


@router.put("/update")
async def update_goal(req: GoalUpdateRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            # update goal
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

            # update assigned_goal
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

            # delete tasks with status as deleted
            for task in req.goal.tasks:
                if task.status == T.Status.DELETED:
                    await conn.execute(
                        """
                        DELETE FROM task
                        WHERE id = $1
                        """,
                        task.id,
                    )

            # Update or add new tasks
            for task in req.goal.tasks:
                if task.status != T.Status.DELETED:
                    if task.id:  # If the id is an existing task
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
                    else:  # If there is no id, it is a new task.
                        task_id = await conn.fetchrow(
                            """
                            INSERT INTO task (title, description, goal_id, interval, type)
                            VALUES ($1, $2, $3, $4, $5)
                            RETURNING id
                            """,
                            task.title,
                            task.description,
                            req.goal.id,
                            task.week_interval if task.week_interval else None,
                            task.repeat_type,
                        )
                        task.id = task_id["id"]  # Set the new task id

            # Delete old assigned_task and assigned_task_interval
            await conn.execute(
                """
                DELETE FROM assigned_task
                WHERE assigned_goal_id = $1
                """,
                req.assigned_goal_id,
            )

            await conn.execute(
                """
                DELETE FROM assigned_task_interval
                WHERE assigned_task_id IN (
                    SELECT id FROM assigned_task WHERE assigned_goal_id = $1
                )
                """,
                req.assigned_goal_id,
            )

            # Create new assigned_task and assigned_task_interval
            for task in req.goal.tasks:
                if task.status != T.Status.DELETED:
                    # Check if task_id exists in the task table.
                    task_exists = await conn.fetchrow(
                        """
                        SELECT id FROM task WHERE id = $1
                        """,
                        task.id,
                    )

                    if not task_exists:
                        raise HTTPException(
                            status_code=404, detail=f"Task with id {task.id} not found"
                        )

                    # Recalculate interval_date
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
                    elif task.repeat_type == T.RepeatType.MONTHLY:
                        if not task.date_interval:
                            raise HTTPException(
                                400, detail="Monthly interval is required"
                            )
                        else:
                            interval_date = task.date_interval
                    elif task.repeat_type == T.RepeatType.DATE:
                        if not task.date_interval:
                            raise HTTPException(
                                400,
                                detail="Date interval is required for 'date' type tasks",
                            )
                        else:
                            interval_date = (
                                task.date_interval
                            )  # Use the date_interval passed directly.
                    else:
                        raise HTTPException(
                            400,
                            detail="Invalid task type, must be daily, weekly, monthly, or date",
                        )

                    # Create a new assigned_task and assigned_task_interval for each date.
                    for date in interval_date:
                        # Create a new assigned_task
                        assigned_task_id = await conn.fetchrow(
                            """
                            INSERT INTO assigned_task (assigned_goal_id, task_id)
                            VALUES ($1, $2)
                            RETURNING id
                            """,
                            req.assigned_goal_id,
                            task.id,
                        )

                        # Create a new assigned_task_interval
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

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JSONResponse(
                content={"error": f"Unexpected error: {str(e)}"}, status_code=500
            )


@router.get("/{assigned_goal_id}")
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
                # Get date_interval for jobs with Repeat_type of 'date'
                date_interval = []
                if task["repeat_type"] == "date":
                    date_interval = await conn.fetch(
                        """
                        SELECT interval_date
                        FROM assigned_task_interval
                        WHERE assigned_task_id IN (
                            SELECT id FROM assigned_task WHERE task_id = $1 AND assigned_goal_id = $2
                        )
                        """,
                        task["id"],
                        assigned_goal_id,
                    )
                    date_interval = [
                        row["interval_date"].isoformat() for row in date_interval
                    ]

                tasks.append(
                    {
                        "id": task["id"],
                        "title": task["title"],
                        "description": task["description"],
                        "repeat_type": task["repeat_type"],
                        "date_interval": date_interval,
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


@router.get("/")
async def get_goals_today(
    user_id: str,
    today: date = Query(default=date.today(), description="Current date (YYYY-MM-DD)"),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Fetch assigned goals for the user and date range
        assigned_goals = await conn.fetch(
            """
            SELECT ag.*, g.title, g.type
            FROM public.assigned_goal ag
            JOIN public.goal g ON ag.goal_id = g.id
            WHERE ag.user_id = $1
            AND ag.status IN ('pending','success')
            AND ag.start_date <= $2
            AND ag.due_date >= $2
            """,
            user_id,
            today,
        )

        goals: List[FetchGoal] = []
        for ag in assigned_goals:
            tasks = await conn.fetch(
                """
                SELECT at.*, ati.*
                FROM public.assigned_task at
                JOIN public.assigned_task_interval ati ON at.id = ati.assigned_task_id
                WHERE at.assigned_goal_id = $1 
                AND at.status = 'pending'::status
                AND ati.interval_date = $2
                """,
                ag["id"],
                today,
            )

            # Fetch task details and append to the goal's tasks list
            task_list: List[FetchTask] = []
            for task in tasks:
                task_detail = await conn.fetchrow(
                    "SELECT title, description FROM public.task WHERE id = $1",
                    task["task_id"],
                )
                task_list.append(
                    FetchTask(
                        id=task["task_id"],
                        title=task_detail["title"],
                        description=task_detail["description"],
                        status=T.Status(task["status"]),
                    )
                )

            # Append the goal to the list if it has tasks
            if task_list:
                goals.append(
                    FetchGoal(
                        id=ag["id"],
                        title=ag["title"],
                        type=ag["type"],
                        status=T.Status(ag["status"]),
                        start_date=ag["start_date"],
                        due_date=ag["due_date"],
                        tasks=task_list,
                    )
                )

        return goals  # Return the list of goals (filtered to include only those with tasks)


@router.put("/update_task_status")
async def update_task_status(request: TaskUpdateRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if the task exists for the user in the assigned goal
        assigned_task = await conn.fetchrow(
            """
            SELECT at.* 
            FROM public.assigned_task at
            JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
            WHERE at.id = ANY($1)
            AND ag.user_id = $2
            AND at.status = 'pending'

        """,
            request.assigned_task_id,
            request.user_id,
        )
        if not assigned_task:
            raise HTTPException(status_code=404, detail="Task not found for this user")

        res = await conn.execute(
            """
            UPDATE public.assigned_task
            SET status = $1::status
            WHERE id = ANY($2)
            """,
            request.to,
            request.assigned_task_id,
        )

        if not res == "UPDATE 1":
            raise HTTPException(
                status_code=500, detail=f"Error updating task status to {request.to}"
            )

        await check_goal_status(conn, assigned_task["assigned_goal_id"])

        return {
            "message": f"Task status updated to {request.to}",
            "assigned_task_id": request.assigned_task_id,
        }


async def check_goal_status(conn, assigned_goal_id: int):
    """
    Check if the goal should be marked as 'success' or 'failed'
    based on the progress of its tasks.
    """
    # Fetch total tasks and completed tasks under the goal
    task_stats = await conn.fetchrow(
        """
        SELECT 
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS completed_tasks,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_tasks
        FROM public.assigned_task
        WHERE assigned_goal_id = $1
        """,
        assigned_goal_id,
    )

    total_tasks = task_stats["total_tasks"]
    completed_tasks = task_stats["completed_tasks"] or 0
    failed_tasks = task_stats["failed_tasks"] or 0

    # Check if more than half the tasks are completed
    if completed_tasks >= total_tasks / 2:
        # Mark the goal as success
        await conn.execute(
            """
            UPDATE public.assigned_goal
            SET status = 'success'
            WHERE id = $1
            """,
            assigned_goal_id,
        )
    elif failed_tasks >= total_tasks / 2:
        # Mark the goal as failed and update only remaining pending tasks
        await conn.execute(
            """
            UPDATE public.assigned_goal
            SET status = 'failed'
            WHERE id = $1
            """,
            assigned_goal_id,
        )

        await conn.execute(
            """
            UPDATE public.assigned_task
            SET status = 'failed'
            WHERE assigned_goal_id = $1
            AND status = 'pending'
            """,
            assigned_goal_id,
        )
