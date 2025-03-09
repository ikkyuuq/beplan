from datetime import date
from enum import Enum
from typing import List, Optional

from asyncpg import Connection
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from const import types as T
from database import get_db_pool

router = APIRouter()


class FetchTask(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: T.Status


class FetchGoal(BaseModel):
    id: int
    title: str
    status: T.Status
    start_date: date
    due_date: date
    tasks: List[FetchTask] = []


class GoalUpdateRequest(BaseModel):
    to: Optional[T.Status] = None
    assigned_goal_id: int
    user_id: str
    today: Optional[date] = date.today()


class TaskUpdateRequest(BaseModel):
    to: T.Status
    user_id: str
    assigned_task_id: List[int]


@router.get("/goals")
async def get_goals_today(
    user_id: str = Query(..., description="User ID"),
    today: date = Query(default=date.today(), description="Current date (YYYY-MM-DD)"),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Fetch assigned goals for the user and date range
        assigned_goals = await conn.fetch(
            """
            SELECT ag.*, g.title
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

        goals: List[Goal] = []
        for ag in assigned_goals:
            tasks = await conn.fetch(
                """
                SELECT at.*, ati.*
                FROM public.assigned_task at
                JOIN public.assigned_task_interval ati ON at.id = ati.assigned_task_id
                WHERE at.assigned_goal_id = $1 
                AND at.status = 'pending'::task_status
                AND ati.interval_date = $2
                """,
                ag["id"],
                today,
            )

            # Fetch task details and append to the goal's tasks list
            task_list: List[Task] = []
            for task in tasks:
                task_detail = await conn.fetchrow(
                    "SELECT title, description FROM public.task WHERE id = $1",
                    task["task_id"],
                )
                task_list.append(
                    Task(
                        id=task["task_id"],
                        title=task_detail["title"],
                        description=task_detail["description"],
                        status=T.Status(task["status"]),
                    )
                )

            # Append the goal to the list if it has tasks
            if task_list:
                goals.append(
                    Goal(
                        id=ag["goal_id"],
                        title=ag["title"],
                        status=T.Status(ag["status"]),
                        start_date=ag["start_date"],
                        due_date=ag["due_date"],
                        tasks=task_list,
                    )
                )

        return goals  # Return the list of goals (filtered to include only those with tasks)


# Implement update methods to set goal status to 'delete','completed' and 'failed'
# @router.put("/update_goal_status")
# async def update_goal_status(request: GoalUpdateRequest):
#     pool = await get_db_pool()
#     async with pool.acquire() as conn:
#         # Check if the goal exists for the user on that date
#         assigned_goal = await conn.fetchrow(
#             """
#             SELECT * FROM public.assigned_goal
#             WHERE id = $1
#             AND user_id = $2
#             AND start_date <= $3
#             AND due_date >= $3
#             """,
#             request.assigned_goal_id,
#             request.user_id,
#             request.today,
#         )

#         if not assigned_goal:
#             raise HTTPException(
#                 status_code=404, detail="Goal not found for this user and date"
#             )

#         # Update goal status
#         res = await conn.execute(
#             """
#             UPDATE public.assigned_goal
#             SET status = $1::status
#             WHERE id = $2
#             AND user_id = $3
#             AND due_date >= $4
#             """,
#             request.to,
#             request.assigned_goal_id,
#             request.user_id,
#             request.today,
#         )


#         if not res == "UPDATE 1":
#             raise HTTPException(
#                 status_code=500, detail=f"Error updating goal status to '{request.to}'"
#             )

#         if request.to == Status.DELETED:
#             await conn.execute(
#             """
#             UPDATE public.assigned_task
#             SET status = 'deleted'
#             WHERE assigned_goal_id = $1
#             """,
#             request.assigned_goal_id,
#             )


async def check_goal_status(conn: Connection, assigned_goal_id: int):
    """
    Check if the goal should be marked as 'success' or 'failed'
    based on the progress of its tasks.
    """
    # Fetch total tasks and completed tasks under the goal
    task_stats = await conn.fetchrow(
        """
        SELECT 
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS completed_tasks
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
    else:
        return


# Implement update task status
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
