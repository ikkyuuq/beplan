from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
from datetime import date
from typing import List, Optional

app = FastAPI()

# ตัวเลือกสำหรับ Repeat Mode
class RepeatMode(str, Enum):
    daily = "Daily"
    weekly = "Weekly"
    monthly = "Monthly"

# รูปแบบข้อมูล Task ที่รับจากฟอร์ม
class TaskCreate(BaseModel):
    title: str = Field(..., example="Pay bills")
    repeat: RepeatMode
    start_date: Optional[date] = Field(None, example="2025-02-01")
    finish_date: Optional[date] = Field(None, example="2025-12-31")
    
    # เงื่อนไขเพิ่มเติม
    days: Optional[List[str]] = None  # สำหรับ Weekly เท่านั้น
    day: Optional[int] = None  # สำหรับ Monthly เท่านั้น

    # ตรวจสอบเงื่อนไขการใช้งาน
    def validate_task(self):
        if self.repeat == RepeatMode.weekly and not self.days:
            raise ValueError("ต้องระบุ days เมื่อเลือก Weekly")
        if self.repeat == RepeatMode.monthly and not self.day:
            raise ValueError("ต้องระบุ day เมื่อเลือก Monthly")

# รูปแบบข้อมูล Topic ที่ประกอบด้วยหลาย Task
class TopicCreate(BaseModel):
    topic: str
    tasks: List[TaskCreate]

# เก็บข้อมูลไว้ใน memory
tasks_db: List[TopicCreate] = []

# POST /tasks → เพิ่ม Task ใหม่
@app.post("/tasks", response_model=dict)
def create_task(topic: TopicCreate):
    try:
        # ตรวจสอบทุก task ภายใน topic
        for task in topic.tasks:
            task.validate_task()
        tasks_db.append(topic)
        return {"status": "success", "message": "Topic with tasks created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# GET /tasks → ดึงรายการ Topic และ Task ทั้งหมด
@app.get("/tasks", response_model=List[TopicCreate])
def get_tasks():
    return tasks_db
