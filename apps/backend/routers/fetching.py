import os
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel
from ..database import get_db_pool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
router = APIRouter()

#Define goals & tasks medel
class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: datetime
    completed: bool = False

class Goal(BaseModel):
    id: Optional[int] = None
    title: str
    completed: bool = False
    category: Optional[str] = None
    subtasks: List[Task] = []

#Implement get goals from database
@router.get("/goals/",response_model=List[Goal]) #Fetch all goals

async def get_goals():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        goals = await conn.fetch("SELECT * FROM public.goal")
        goal_list=[]

        for goal in goals:
            subtasks = await conn.fetch("SELECT * FROM public.task WHERE goal_id=$1", goal["id"])
            goal_list.append(
                Goal(
                    id = goal["id"],
                    title = goal["title"],
                    completed = goal["completed"],
                    category = goal["category"],
                    subtasks = [
                        Task(
                            id = subtask["id"],
                            title = subtask["title"],
                            completed = subtask["completed"],
                            description = subtask["description"],
                            due_date = subtask["due_date"],
                        )

                        for subtask in subtasks

                    ],
                )
            )
        return goal_list

@router.get("/goals/{goal_id}", response_model=Goal) #Fetch single goal
async def get_goal(goal_id: int):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        goal = await conn.fetchrow("SELECT * FROM public.goal WHERE id=$1", goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        subtasks = await conn.fetch("SELECT * FROM public.task WHERE goal_id=$1", goal_id)
        return Goal(
                id = goal["id"],
                title = goal["title"],
                completed = goal["completed"],
                category = goal["category"],
                subtasks = [
                    Task(
                        id = subtask["id"],
                        title = subtask["title"],
                        completed = subtask["completed"],
                        description = subtask["description"],
                        due_date = subtask["due_date"],
                    )
                    
                    for subtask in subtasks

                ],
            )
        

#Implement get tasks from database
@router.get("/tasks/",response_model=List[Task]) #Fetch all task

async def get_tasks():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        tasks = await conn.fetch("SELECT * FROM public.task")
        return [
            Task(
                id = task["id"],
                title = task["title"],
                completed = task["completed"],
                description = task["description"],
                due_date = task["due_date"],
            )

            for task in tasks

        ]


@router.get("/tasks/{task_id}", response_model = Task) #Fetch single task

async def get_task(task_id: int):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        task = await conn.fetchrow("SELECT * FROM public.task WHERE id=$1", task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(
        id=task["id"],
        title=task["title"],
        description=task["description"],
        due_date=task["due_date"],
        completed=task["completed"],
    )


app = FastAPI()
app.include_router(router)
