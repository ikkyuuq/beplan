from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from enum import Enum
from datetime import date
from typing import List, Optional
from dotenv import load_dotenv
from datetime import timedelta
import databases
import os
import logging

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")
database = databases.Database(DATABASE_URL)

app = FastAPI()
router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await database.connect()
    await database.execute("SET search_path TO mydb")

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/test_connection")
async def test_connection():
    query = "SELECT 1"
    result = await database.fetch_one(query)
    if result:
        return {"message": "Database connection successful"}
    else:
        return {"message": "Database connection failed"}


class RepeatMode(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class MonthlyOption(str, Enum):
    start = "START"
    mid = "MID"
    end = "END"


class GoalStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class TaskStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskCreate(BaseModel):
    title: str = Field(..., example="Task Title")
    description: Optional[str] = None
    repeat_enabled: bool = False
    repeat: Optional[RepeatMode] = None
    days: Optional[List[int]] = None
    monthly_option: Optional[MonthlyOption] = None
    task_date_new: Optional[date] = None
    status: TaskStatus


class GoalCreate(BaseModel):
    title: str  
    status: GoalStatus
    type: str = Field(default="custom goal")
    start_date: Optional[date] = Field(None, example="2025-02-01")
    finish_date: Optional[date] = Field(None, example="2025-12-31")
    tasks: List[TaskCreate] = None
    user_id: int

class TaskUpdate(BaseModel):
    id: int 
    title: Optional[str] = None
    description: Optional[str] = None
    repeat_enabled: Optional[bool] = None
    repeat: Optional[str] = None  
    days: Optional[List[int]] = None 
    status: Optional[str] = None  
    task_date_new: Optional[date] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    type: str = Field(default="custom goal")
    start_date: Optional[date] = None
    finish_date: Optional[date] = None
    status: Optional[str] = None
    tasks: List[TaskUpdate] 


def calculate_daily_interval_dates(start_date: date, finish_date: date, assigned_task_id: int) -> List[dict]:
    interval_dates = []
    current_date = start_date
    while current_date <= finish_date:
        interval_dates.append({
            "assigned_task_id": assigned_task_id,
            "interval_date": current_date
        })
        current_date += timedelta(days=1)
    return interval_dates


def calculate_weekly_interval_dates(start_date: date, finish_date: date, days: List[int], assigned_task_id: int) -> List[dict]:
    interval_dates = []
    current_date = start_date
    while current_date <= finish_date:
        if current_date.weekday() in [day - 1 for day in days]:
            interval_dates.append({
                "assigned_task_id": assigned_task_id,
                "interval_date": current_date
            })
        current_date += timedelta(days=1)
    return interval_dates


@router.post("/goals")
async def create_goal(goal: GoalCreate):
    try:
        query_goal = """
        INSERT INTO goal (title, type, created_at, updated_at)
        VALUES (:title, :type, NOW(), NOW()) RETURNING id
        """
        goal_values = {
            "title": goal.title,
            "type": goal.type
        }
        goal_id = await database.fetch_one(query_goal, values=goal_values)

        if not goal_id:
            raise ValueError("Unable to add goal")

    
        query_task = """
        INSERT INTO task (title, description, goal_id, created_at, updated_at, interval)
        VALUES (:title, :description, :goal_id, NOW(), NOW(), :interval) RETURNING id
        """
        task_ids = []

        for task in goal.tasks:
            interval = task.days if task.days and task.repeat_enabled and task.repeat == RepeatMode.weekly else None

            task_values = {
                "title": task.title,
                "description": task.description,
                "goal_id": goal_id["id"],
                "interval": interval
            }
            task_id = await database.fetch_one(query_task, values=task_values)
            task_ids.append(task_id["id"])

        query_assigned_goal = """
        INSERT INTO assigned_goal (start_date, due_date, user_id, goal_id, created_at, status)
        VALUES (:start_date, :due_date, :user_id, :goal_id, NOW(), :status) RETURNING id
        """
        assigned_goal_values = {
            "start_date": goal.start_date,
            "due_date": goal.finish_date,
            "user_id": str(goal.user_id),
            "goal_id": goal_id["id"],
            "status": goal.status
        }
        assigned_goal_id = await database.fetch_one(query_assigned_goal, values=assigned_goal_values)

     
        query_assigned_task = """
        INSERT INTO assigned_task (assigned_goal_id, task_id, created_at, status)
        VALUES (:assigned_goal_id, :task_id, NOW(), :status) RETURNING id
        """

        for task_id, task in zip(task_ids, goal.tasks):
            assigned_task_values = {
                "assigned_goal_id": assigned_goal_id["id"],
                "task_id": task_id,
                "status": task.status
            }
            assigned_task_id = await database.fetch_one(query_assigned_task, values=assigned_task_values)

           
            if not task.repeat_enabled and task.task_date_new:
                interval_dates = [{
                    "assigned_task_id": assigned_task_id["id"],
                    "interval_date": task.task_date_new
                }]
            elif task.repeat_enabled and task.repeat == RepeatMode.daily:
                interval_dates = calculate_daily_interval_dates(goal.start_date, goal.finish_date, assigned_task_id["id"])
            elif task.repeat_enabled and task.repeat == RepeatMode.weekly and task.days:
                interval_dates = calculate_weekly_interval_dates(goal.start_date, goal.finish_date, task.days, assigned_task_id["id"])
            else:
                interval_dates = []

            if interval_dates:
                query_assigned_task_interval = """
                INSERT INTO assigned_task_interval (assigned_task_id, interval_date)
                VALUES (:assigned_task_id, :interval_date)
                """
                for interval_date in interval_dates:
                    await database.execute(query_assigned_task_interval, values=interval_date)

        return JSONResponse(content={"status": "success", "message": "Goal with tasks created successfully"})

    except ValueError as e:
        logger.error(f"ValueError: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=400)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)
    
@router.put("/goals/{goal_id}")
async def update_goal(goal_id: int, goal: GoalUpdate):
    try:
       
        query_update_goal = """
        UPDATE goal 
        SET title = :title, type = :type, updated_at = NOW()
        WHERE id = :goal_id
        """
        goal_values = {
            "title": goal.title,
            "type": goal.type,
            "goal_id": goal_id
        }
        await database.execute(query_update_goal, values=goal_values)

        
        query_update_assigned_goal = """
        UPDATE assigned_goal 
        SET start_date = :start_date, due_date = :due_date, status = :status
        WHERE goal_id = :goal_id
        """
        assigned_goal_values = {
            "start_date": goal.start_date,
            "due_date": goal.finish_date,
            "status": goal.status,
            "goal_id": goal_id
        }
        await database.execute(query_update_assigned_goal, values=assigned_goal_values)

       
        query_update_task = """
        UPDATE task 
        SET title = :title, description = :description, interval = :interval, updated_at = NOW()
        WHERE id = :task_id AND goal_id = :goal_id
        """
        
        for task in goal.tasks:
            interval = task.days if task.days and task.repeat_enabled and task.repeat == RepeatMode.weekly else None
            task_values = {
                "title": task.title,
                "description": task.description,
                "interval": interval,
                "task_id": task.id,
                "goal_id": goal_id
            }
            await database.execute(query_update_task, values=task_values)

       
        query_update_assigned_task = """
        UPDATE assigned_task 
        SET status = :status
        WHERE task_id = :task_id AND assigned_goal_id IN (SELECT id FROM assigned_goal WHERE goal_id = :goal_id)
        """
        
        for task in goal.tasks:
            assigned_task_values = {
                "status": task.status,
                "task_id": task.id,
                "goal_id": goal_id
            }
            await database.execute(query_update_assigned_task, values=assigned_task_values)

       
        query_delete_assigned_task_interval = """
        DELETE FROM assigned_task_interval WHERE assigned_task_id IN (
            SELECT id FROM assigned_task WHERE assigned_goal_id IN (
                SELECT id FROM assigned_goal WHERE goal_id = :goal_id
            )
        )
        """
        await database.execute(query_delete_assigned_task_interval, values={"goal_id": goal_id})

       
        query_create_assigned_task_interval = """
        INSERT INTO assigned_task_interval (assigned_task_id, interval_date)
        VALUES (:assigned_task_id, :interval_date)
        """
        
        for task in goal.tasks:
            assigned_task_id = await database.fetch_one(
                "SELECT id FROM assigned_task WHERE task_id = :task_id", 
                values={"task_id": task.id}
            )

            if not task.repeat_enabled and task.task_date_new:
                interval_dates = [{
                    "assigned_task_id": assigned_task_id["id"],
                    "interval_date": task.task_date_new
                }]
            elif task.repeat_enabled and task.repeat == RepeatMode.daily:
                interval_dates = calculate_daily_interval_dates(goal.start_date, goal.finish_date, assigned_task_id["id"])
            elif task.repeat_enabled and task.repeat == RepeatMode.weekly and task.days:
                interval_dates = calculate_weekly_interval_dates(goal.start_date, goal.finish_date, task.days, assigned_task_id["id"])
            else:
                interval_dates = []

            if interval_dates:
                for interval_date in interval_dates:
                    await database.execute(query_create_assigned_task_interval, values=interval_date)

        return JSONResponse(content={"status": "success", "message": "Goal and related tasks updated successfully"})

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)

    
app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)