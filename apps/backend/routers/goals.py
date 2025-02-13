from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from enum import Enum
from datetime import date,datetime,timedelta
from typing import List, Optional
import uuid
import calendar
from fastapi.encoders import jsonable_encoder

router = APIRouter()

# ตัวเลือกสำหรับ Repeat Mode
class RepeatMode(str, Enum):
    daily = "Daily"
    weekly = "Weekly"
    monthly = "Monthly"
    
class MonthlyOption(str, Enum):
    start = "START"
    mid = "MID"
    end = "END"

# รูปแบบข้อมูล Task ที่รับจากฟอร์ม
class TaskCreate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))  # สร้าง id อัตโนมัติ
    title: str = Field(..., example="xxxx")
    repeat_enabled: bool = False
    repeat: Optional[RepeatMode] = None
    
    # เงื่อนไขเพิ่มเติม
    days: Optional[List[str]] = None  # สำหรับ Weekly เท่านั้น
    monthly_option: Optional[MonthlyOption] = None  # สำหรับ Monthly เท่านั้น
    start_date: Optional[date] = None  # เพิ่ม start_date ใน Task

    # ตรวจสอบเงื่อนไขการใช้งาน
    def validate_task(self):
        if not self.repeat_enabled:
            # ถ้าปิด repeat ห้ามมีค่า repeat, days, monthly_option
            if self.repeat or self.days or self.monthly_option:
                raise ValueError("ไม่สามารถกำหนด repeat, days หรือ monthly_option ได้ เมื่อปิด repeat")
        else:
            # ถ้าเปิด repeat ต้องมี repeat mode
            if not self.repeat:
                raise ValueError("ต้องระบุ repeat mode ถ้าเปิดใช้งาน repeat")
            if self.repeat == RepeatMode.weekly and not self.days:
                raise ValueError("ต้องระบุ days เมื่อเลือก Weekly")
            if self.repeat == RepeatMode.monthly and not self.monthly_option:
                raise ValueError("ต้องระบุ monthly_option เมื่อเลือก Monthly")


# รูปแบบข้อมูล Topic ที่ประกอบด้วยหลาย Task
class TopicCreate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))  # เพิ่ม ID
    topic: str
    start_date: Optional[date] = Field(None, example="2025-02-01")
    finish_date: Optional[date] = Field(None, example="2025-12-31")
    tasks: List[TaskCreate] = None

def calculate_monthly_date_from_range(start_date: date, finish_date: date, monthly_option: MonthlyOption) -> date:
    if not start_date or not finish_date:
        raise ValueError("Start date and Finish date must be provided")
    
    # คำนวณวันที่ 1 ของเดือนจาก start_date
    first_day_of_month = datetime(start_date.year, start_date.month, 1)
    
    # คำนวณวันที่กลางของเดือน
    mid_day = first_day_of_month + timedelta(days=calendar.monthrange(start_date.year, start_date.month)[1] // 2)
    
    # คำนวณวันที่สุดท้ายของเดือนจาก finish_date
    last_day_of_month = datetime(finish_date.year, finish_date.month, calendar.monthrange(finish_date.year, finish_date.month)[1])
    
    if monthly_option == MonthlyOption.start:
        return first_day_of_month.date()
    elif monthly_option == MonthlyOption.mid:
        return mid_day.date()
    elif monthly_option == MonthlyOption.end:
        return last_day_of_month.date()

# เก็บข้อมูลไว้ใน memory
tasks_db: List[TopicCreate] = []

# POST /tasks → เพิ่ม Task ใหม่
@router.post("/tasks")
def create_task(topic: TopicCreate):
    try:
        # คำนวณวันที่สำหรับ Task ที่มี repeat เป็น Monthly
        for task in topic.tasks:
            if task.repeat == RepeatMode.monthly and task.monthly_option:
                task_date = calculate_monthly_date_from_range(topic.start_date, topic.finish_date, task.monthly_option)
                # อัปเดต start_date ของ Task ที่คำนวณแล้ว
                task.start_date = task_date  
            task.validate_task()
        
        tasks_db.append(topic)
        return JSONResponse(content={"status": "success", "message": "Topic with tasks created successfully"})
    except ValueError as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": f"Unexpected error: {str(e)}"}, status_code=500)


# GET /tasks → ดึงรายการ Topic และ Task ทั้งหมด
@router.get("/tasks")
def get_tasks():
    return JSONResponse(content=jsonable_encoder(tasks_db))

@router.put("/tasks/{task_id}")
def update_task(task_id: str, updated_task: TaskCreate):
    for topic in tasks_db:
        for index, task in enumerate(topic.tasks):
            if task.id == task_id:
                topic.tasks[index] = updated_task
                return JSONResponse(content={"status": "success", "message": "Task updated successfully"})
    raise JSONResponse(status_code=404, detail="Task not found")

@router.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    for topic in tasks_db:
        for index, task in enumerate(topic.tasks):
            if task.id == task_id:
                del topic.tasks[index]  # ลบ Task ออกจากรายการ
                return JSONResponse(content={"status": "success", "message": "Task deleted successfully"})
    
    return JSONResponse(content={"error": "Task not found"}, status_code=404)

@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: str):
    global tasks_db
    tasks_db = [topic for topic in tasks_db if topic.id != topic_id]
    return JSONResponse(content={"status": "success", "message": "Topic deleted successfully"})


@router.put("/tasks/{topic_id}")
def update_topic(topic_id: str, updated_topic: TopicCreate):
    for index, topic in enumerate(tasks_db):
        if topic.id == topic_id:
            # แก้ไข topic
            tasks_db[index] = updated_topic
            return JSONResponse(content={"status": "success", "message": f"Topic with id '{topic_id}' updated successfully"})
    return JSONResponse(status_code=404, content={"error": "Topic not found"})


@router.put("/topics/{topic_id}")
def update_topic(topic_id: str, updated_topic: TopicCreate):
    for idx, topic in enumerate(tasks_db):
        if topic.id == topic_id:
            # อัปเดตชื่อของ topic
            tasks_db[idx].topic = updated_topic.topic
            tasks_db[idx].start_date = updated_topic.start_date  # อัปเดต start_date
            tasks_db[idx].finish_date = updated_topic.finish_date  # อัปเดต finish_date
            # ถ้ามีการส่ง tasks ใหม่เข้ามา จะอัปเดต tasks ด้วย
            if updated_topic.tasks:
                tasks_db[idx].tasks = updated_topic.tasks
            return JSONResponse(content={"status": "success", "message": "Topic updated successfully"})
    return JSONResponse(content={"error": "Topic not found"}, status_code=404)


