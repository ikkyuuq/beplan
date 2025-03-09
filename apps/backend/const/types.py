from datetime import date
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RepeatType(str, Enum):
    DATE = "date"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Status(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    DELETED = "deleted"


class GoalType(str, Enum):
    CUSTOM_GOAL = "custom goal"
    SMART_GOAL = "smart goal"
    TEMPLATE = "template"
    COMMUNITY = "community"


class Task(BaseModel):
    title: str
    description: Optional[str] = None
    repeat_type: RepeatType
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None


class Goal(BaseModel):
    title: str
    type: GoalType = Field(default=GoalType.CUSTOM_GOAL)
    start_date: date
    due_date: date
    tasks: List[Task]


class GoalCreateRequest(BaseModel):
    user_id: str
    goal: Goal
