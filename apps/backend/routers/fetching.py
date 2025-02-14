import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional

import asyncpg
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from database import get_db_pool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
router = APIRouter()


class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: datetime
    completed: bool = False


@router.get(
    "/tasks/",
)
async def get_tasks():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        resp = await conn.fetch("SELECT * FROM public.task")
        return resp


@router.get(
    "/tasks/{task_id}",
)
async def get_task(
    task_id: int,
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        resp = await conn.fetchrow("SELECT * FROM public.task WHERE id=$1", task_id)
    if resp is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return resp


# FIX: This is fucking shit, please recheck the neon table schema carefully
# You can pass response_model if want to validate the result, but without it's ok.
#
# @router.put("/tasks/{task_id}", response_model=Task)
# async def update_task(task_id: int, updated_task: Task, db=Depends(get_db)):
#     async with db.acquire() as conn:
#         result = await conn.execute(
#             """
#             UPDATE tasks SET title=$1, description=$2, due_date=$3, completed=$4
#             WHERE id=$5
#         """,
#             updated_task.title,
#             updated_task.description,
#             updated_task.due_date,
#             updated_task.completed,
#             task_id,
#         )
#     if result == "UPDATE 0":
#         raise HTTPException(status_code=404, detail="Task not found")
#     return updated_task
#
#
# @router.delete("/tasks/{task_id}", status_code=204)
# async def delete_task(task_id: int, db=Depends(get_db)):
#     async with db.acquire() as conn:
#         result = await conn.execute("DELETE FROM tasks WHERE id=$1", task_id)
#     if result == "DELETE 0":
#         raise HTTPException(status_code=404, detail="Task not found")
#     return {"message": "Task deleted"}
#
