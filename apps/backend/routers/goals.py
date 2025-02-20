from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from enum import Enum
from datetime import date
from typing import List, Optional
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
import databases
import os
load_dotenv()
# ตั้งค่าการเชื่อมต่อกับฐานข้อมูล Neon
#DATABASE_URL = "postgresql://neondb_owner:npg_5TynrRlFLPx8@ep-autumn-poetry-a1ijhfkw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&options=-c%20search_path%3Dmydb"
DATABASE_URL = os.getenv("DATABASE_URL")
database = databases.Database(DATABASE_URL)

app = FastAPI()


router = APIRouter()

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

@app.get("/test")
async def test():
    query = "SELECT * from task"  
    result = await database.fetch_all(query)
    if result:
        return {"data": result}
    else:
        return {"message": "No data found"}



class RepeatMode(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
  
    
class MonthlyOption(str, Enum):
    start = "START"
    mid = "MID"
    end = "END"

current_id = 1

def generate_id():
    global current_id
    id = current_id
    current_id += 1
    return id


class TaskCreate(BaseModel):
    id: int = Field(default_factory=generate_id)  
    title: str = Field(..., example="xxxx")
    repeat_enabled: bool = False
    repeat: Optional[RepeatMode] = None
    days: Optional[List[str]] = None  
    monthly_option: Optional[MonthlyOption] = None
    task_date_new: Optional[date] = None  
    

class goalCreate(BaseModel):
    id: int = Field(default_factory=generate_id)
    goal: str
    start_date: Optional[date] = Field(None, example="2025-02-01")
    finish_date: Optional[date] = Field(None, example="2025-12-31")
    tasks: List[TaskCreate] = None
    user_id: int  

@router.post("/goals")
async def create_goal(goal: goalCreate):
    try:
        
        query_goal = """
        INSERT INTO goal (title, type, category, created_at, updated_at)
        VALUES (:title, :type, :category, DEFAULT, DEFAULT) RETURNING id
        """
        goal_values = {
            "title": goal.goal,  
            "type": "test",  
            "category": None,
        }
        goal_id = await database.fetch_one(query_goal, values=goal_values)

        if not goal_id:
            raise ValueError("Unable to add goal")

        
        query_task = """
        INSERT INTO task (title, description, goal_id, created_at, updated_at, type)
        VALUES (:title, :description, :goal_id, DEFAULT, DEFAULT, :type)
        """

        for task in goal.tasks:
            
            repeat_type = task.repeat if task.repeat_enabled else None 
            task_values = {
                "title": task.title,
                "description": "test",  
                "goal_id": goal_id["id"],
                "type": repeat_type  
            }
            await database.execute(query_task, values=task_values)

        return JSONResponse(content={"status": "success", "message": "Goal with tasks created successfully"})
    except ValueError as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)


app.include_router(router)
