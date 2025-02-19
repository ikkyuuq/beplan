import os
from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Query,FastAPI
from pydantic import BaseModel

from database import get_db_pool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
router = APIRouter()
app = FastAPI()


class GoalStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class TaskStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class Task(BaseModel):
    id: int
    title: str
    description: str | None
    status: TaskStatus


class Goal(BaseModel):
    id: int
    title: str
    status: GoalStatus
    category: str
    start_date: date
    due_date: date
    tasks: List[Task] = []

@router.get("/goals")
async def get_goals_today(
    user_id: int = Query(..., description="User ID"),
    today: date = Query(..., description="Current date (YYYY-MM-DD)"),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Fetch assigned goals for the user and date range
        assigned_goals = await conn.fetch(
            """
            SELECT ag.*, g.*
            FROM public.assigned_goal ag
            JOIN public.goal g ON ag.goal_id = g.id
            WHERE ag.user_id = $1 
            AND ag.status = 'pending'
            AND ag.start_date <= $2 
            AND ag.due_date >= $2
            """,
            str(user_id),
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
                        status=TaskStatus(task["status"]),
                    )
                )

            # Append the goal to the list if it has tasks
            if task_list:
                goals.append(
                    Goal(
                        id=ag["goal_id"],
                        title=ag["title"],
                        status=GoalStatus(ag["status"]),
                        category=ag["category"],
                        start_date=ag["start_date"],
                        due_date=ag["due_date"],
                        tasks=task_list,
                    )
                )

        return goals  # Return the list of goals (filtered to include only those with tasks)

# NOTE: Be sure to communicate with Korn and the team to not repeat the same work
# or same functionality routes

# NOTE: This might be useful for the analysis page to show the user's progress
# but it's still need more work to be done

# Implement get goals from database
@router.get("/goal/", response_model=List[Goal])  # Fetch all goals
async def get_goals():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        goals = await conn.fetch("SELECT * FROM public.goal")
        goal_list = []

        for goal in goals:
            subtasks = await conn.fetch(
                "SELECT * FROM public.task WHERE goal_id=$1", goal["id"]
            )
            goal_list.append(
                Goal(
                    id=goal["id"],
                    title=goal["title"],
                    completed=goal["status"],
                    category=goal["category"],
                    subtasks=[
                        Task(
                            id=subtask["id"],
                            title=subtask["title"],
                            completed=subtask["status"],
                            description=subtask["description"],
                            due_date=subtask["due_date"],
                        )
                        for subtask in subtasks
                    ],
                )
            )
        return goal_list

# NOTE: This might be useful for the analysis page to show the user's progress

# @router.get("/goals/{goal_id}", response_model=Goal)  # Fetch single goal
# async def get_goal(goal_id: int):
#     pool = await get_db_pool()
#     async with pool.acquire() as conn:
#         goal = await conn.fetchrow("SELECT * FROM public.goal WHERE id=$1", goal_id)
#         if not goal:
#             raise HTTPException(status_code=404, detail="Goal not found")
#
#         subtasks = await conn.fetch(
#             "SELECT * FROM public.task WHERE goal_id=$1", goal_id
#         )
#         return Goal(
#             id=goal["id"],
#             title=goal["title"],
#             completed=goal["completed"],
#             category=goal["category"],
#             subtasks=[
#                 Task(
#                     id=subtask["id"],
#                     title=subtask["title"],
#                     completed=subtask["completed"],
#                     description=subtask["description"],
#                     due_date=subtask["due_date"],
#                 )
#                 for subtask in subtasks
#             ],
#         )
#
#
# # Implement get tasks from database
# @router.get("/tasks/", response_model=List[Task])  # Fetch all task
# async def get_tasks():
#     pool = await get_db_pool()
#     async with pool.acquire() as conn:
#         tasks = await conn.fetch("SELECT * FROM public.task")
#         return [
#             Task(
#                 id=task["id"],
#                 title=task["title"],
#                 completed=task["completed"],
#                 description=task["description"],
#                 due_date=task["due_date"],
#             )
#             for task in tasks
#         ]
#
#
# @router.get("/tasks/{task_id}", response_model=Task)  # Fetch single task
# async def get_task(task_id: int):
#     pool = await get_db_pool()
#     async with pool.acquire() as conn:
#         task = await conn.fetchrow("SELECT * FROM public.task WHERE id=$1", task_id)
#     if task is None:
#         raise HTTPException(status_code=404, detail="Task not found")
#     return Task(
#         id=task["id"],
#         title=task["title"],
#         description=task["description"],
#         due_date=task["due_date"],
#         completed=task["completed"],
#     )
