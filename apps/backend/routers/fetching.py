from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import asyncpg
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
app = FastAPI()

db_pool: asyncpg.Pool

async def init_db():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL)

async def close_db():
    if db_pool is not None:
        await db_pool.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()

app = FastAPI(lifespan=lifespan)

class Task(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    due_date: datetime
    completed: bool = False

async def get_db():
    if db_pool is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db_pool

# @app.post("/tasks/", response_model=Task, status_code=201)
# async def create_task(task: Task, db=Depends(get_db)):
#     async with db.acquire() as conn:
#         result = await conn.fetchrow("""
#             INSERT INTO tasks (title, description, due_date, completed)
#             VALUES ($1, $2, $3, $4) RETURNING id
#         """, task.title, task.description, task.due_date, task.completed)
#     task.id = result["id"]
#     return task

@app.get("/tasks/", response_model=List[Task])
async def get_tasks(db=Depends(get_db)):
    async with db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM tasks")
    return [Task(**dict(row)) for row in rows]

@app.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: int, db=Depends(get_db)):
    async with db.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM tasks WHERE id=$1", task_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**dict(row))

@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, updated_task: Task, db=Depends(get_db)):
    async with db.acquire() as conn:
        result = await conn.execute("""
            UPDATE tasks SET title=$1, description=$2, due_date=$3, completed=$4
            WHERE id=$5
        """, updated_task.title, updated_task.description, updated_task.due_date, updated_task.completed, task_id)
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task

@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int, db=Depends(get_db)):
    async with db.acquire() as conn:
        result = await conn.execute("DELETE FROM tasks WHERE id=$1", task_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)