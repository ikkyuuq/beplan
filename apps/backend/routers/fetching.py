import os
from datetime import date
from enum import Enum
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database import get_db_pool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
router = APIRouter()

class Status(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    DELETED = "deleted"

class Task(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: Status


class Goal(BaseModel):
    id: int
    title: str
    status: Status
    start_date: date
    due_date: date
    tasks: List[Task] = []


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
            AND ag.status = 'pending'
            AND ag.start_date <= $2
            AND ag.due_date >= $2
            """,
            user_id,
            today,
        )

        goals: List[Goal] = []
        for ag in assigned_goals:
            # Fetch tasks for the assigned goal and interval date
            tasks = await conn.fetch(
                """
                SELECT at.*, ati.interval_date
                FROM public.assigned_task at
                JOIN public.assigned_task_interval ati ON at.id = ati.assigned_task_id
                WHERE at.assigned_goal_id = $1 
                AND at.status = 'pending'
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
                        status=Status(task["status"]),
                    )
                )

            # Append the goal to the list if it has tasks
            if task_list:
                goals.append(
                    Goal(
                        id=ag["goal_id"],
                        title=ag["title"],
                        status=Status(ag["status"]),
                        start_date=ag["start_date"],
                        due_date=ag["due_date"],
                        tasks=task_list,
                    )
                )

        return goals  # Return the list of goals (filtered to include only those with tasks)

# Implement update methods to set goal status to 'delete','completed' and 'failed'
@router.put("/update_goal_status")
async def update_goal_status(
    to: Status,
    assigned_goal_id: int,
    user_id: str = Query(..., description="User ID"),
    today: date = Query(
        default=date.today(),
        description="Date for which goal should be updated (YYYY-MM-DD)",
    ),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if the goal exists for the user on that date
        assigned_goal = await conn.fetchrow(
            """
            SELECT * FROM public.assigned_goal
            WHERE id = $1
            AND user_id = $2
            AND start_date <= $3
            AND due_date >= $3
            """,
            assigned_goal_id,
            user_id,
            today,
        )

        if not assigned_goal:
            raise HTTPException(
                status_code=404, detail="Goal not found for this user and date"
            )

        # Update goal status
        res = await conn.execute(
            """
            UPDATE public.assigned_goal
            SET status = $1::status
            WHERE id = $2
            AND user_id = $3
            AND due_date >= $4
            """,
            to,
            assigned_goal_id,
            user_id,
            today,
        )

        if not res == "UPDATE 1":
            raise HTTPException(
                status_code=500, detail=f"Error updating goal status to '{to}'"
            )
    
        if to == Status.DELETED:
            await conn.execute(
            """
            UPDATE public.assigned_task
            SET status = 'deleted'
            WHERE assigned_goal_id = $1
            """,
            assigned_goal_id,
            )

    return {
        "message": f"Goal status updated to '{to}', and tasks updated if applicable.",
        "assigned_goal_id": assigned_goal_id,
    }
             

#Implement update task status
@router.put("/update_task_status")
async def update_task_status(
    to:Status,
    assigned_task_id: int,
    user_id:str = Query(...,description="User_ID"),

):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if the task exists for the user in the assigned goal
        assigned_task = await conn.fetchrow(
        """
            SELECT at.* 
            FROM public.assigned_task at
            JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
            WHERE at.id = $1
            AND ag.user_id = $2
            AND at.status = 'pending'

        """,
        assigned_task_id,
        user_id,
    )
        
        if not assigned_task:
            raise HTTPException(
                status_code=404, detail = "Task not found for this user"
            )

        res = await conn.execute(
            """
            UPDATE public.assigned_task
            SET status = $1::status
            WHERE id = $2
            """,
            to,
            assigned_task_id,
        )

        if not res == "UPDATE 1":
            raise HTTPException(
                status_code=500, detail=f"Error updating task status to {to}"
            )
        
        return{
            "message": f"Task status updated to {to}",
            "assigned_task_id": assigned_task_id,
        }
