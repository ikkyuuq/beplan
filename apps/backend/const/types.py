from datetime import date
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RepeatMode(str, Enum):
    date = "date"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class Status(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"


class TaskType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class GoalType(str, Enum):
    CUSTOM = "custom goal"
    AI = "smart goal"
    TEMPLATE = "template"
    COMMUNITY = "community"


class Task(BaseModel):
    title: str
    description: Optional[str] = None
    repeat_type: RepeatMode
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None


class Goal(BaseModel):
    title: str
    type: str = Field(default="custom goal")
    start_date: date
    due_date: date
    tasks: List[Task]


class GoalCreateRequest(BaseModel):
    user_id: str
    goal: Goal
