from datetime import datetime
from enum import Enum
from typing import List, Optional

from asyncpg import UniqueViolationError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db_pool

router = APIRouter()


class GoalType(str, Enum):
    CUSTOM_GOAL = "custom goal"
    SMART_GOAL = "smart goal"
    TEMPLATE = "template"
    COMMUNITY = "community"


class TaskType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Task(BaseModel):
    title: str
    description: Optional[str] = None
    type: TaskType
    date: Optional[str] = None
    interval: Optional[int] = None


class Goal(BaseModel):
    title: str
    type: GoalType
    start_date: str
    due_date: str
    tasks: List[Task]


class CreateTemplateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    created_by: Optional[str] = "BePlan"
    category: str
    goals: List[Goal]


@router.post("/create_template")
async def create_template(req: CreateTemplateRequest):
    pass


class AssignTemplateRequest(BaseModel):
    template_id: int
    user_id: str
    start_date: str


@router.post("/assign_template")
async def assign_template(req: AssignTemplateRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO public.assigned_template (user_id, template_id)
                    VALUES ($1, $2)
                    """,
                    req.user_id,
                    req.template_id,
                )

                try:
                    tmpl_goals = await conn.fetch(
                        """
                        SELECT * FROM public.tmpl_goal
                        WHERE template_id = $1
                        """,
                        req.template_id,
                    )
                except Exception as e:
                    raise HTTPException(
                        400, detail=f"Error fetching template goals, {e}"
                    )

                try:
                    dates = await conn.fetchrow(
                        """
                        SELECT start_date, due_date FROM public.template
                        WHERE id = $1 
                        """,
                        req.template_id,
                    )
                    if not dates:
                        raise HTTPException(400, detail="Template not found")
                except Exception as e:
                    raise HTTPException(
                        400, detail=f"Error fetching template dates, {e}"
                    )

                original_start_date = dates["start_date"]
                original_due_date = dates["due_date"]
                delta = original_due_date - original_start_date

                new_start_date_dt = datetime.strptime(req.start_date, "%Y-%m-%d")
                new_due_date_dt = new_start_date_dt + delta

                for tmpl_goal in tmpl_goals:
                    try:
                        assign_goal = await conn.fetchrow(
                            """
                            INSERT INTO public.assigned_goal (user_id, goal_id, start_date, due_date)
                            VALUES ($1, $2, $3, $4)
                            RETURNING id
                            """,
                            req.user_id,
                            tmpl_goal["goal_id"],
                            new_start_date_dt.date(),
                            new_due_date_dt.date(),
                        )
                    except Exception as e:
                        raise HTTPException(400, detail=f"Error assigning goal, {e}")

                    try:
                        tmpl_goal_tasks = await conn.fetch(
                            """
                            SELECT * FROM public.tmpl_goal_task
                            WHERE tmpl_goal_id = $1
                            """,
                            tmpl_goal["id"],
                        )
                    except Exception as e:
                        raise HTTPException(
                            400, detail=f"Error fetching template goal tasks, {e}"
                        )

                    for tmpl_goal_task in tmpl_goal_tasks:
                        try:
                            assign_task = await conn.fetchrow(
                                """
                                INSERT INTO public.assigned_task (assigned_goal_id, task_id)
                                VALUES ($1, $2)
                                RETURNING id
                                """,
                                assign_goal["id"],
                                tmpl_goal_task["task_id"],
                            )
                        except Exception as e:
                            raise HTTPException(
                                400, detail=f"Error assigning task, {e}"
                            )

                        try:
                            tmpl_goal_task_intervals = await conn.fetch(
                                """
                                SELECT * FROM public.tmpl_goal_task_interval
                                WHERE tmpl_goal_task_id = $1
                                """,
                                tmpl_goal_task["id"],
                            )
                        except Exception as e:
                            raise HTTPException(
                                400,
                                detail=f"Error fetching template goal task intervals, {e}",
                            )

                        for tmpl_goal_task_interval in tmpl_goal_task_intervals:
                            original_interval_date = tmpl_goal_task_interval[
                                "interval_date"
                            ]
                            new_interval_date = new_start_date_dt + (
                                original_interval_date - original_start_date
                            )
                            try:
                                await conn.execute(
                                    """
                                    INSERT INTO public.assigned_task_interval (assigned_task_id, interval_date)
                                    VALUES ($1, $2)
                                    """,
                                    assign_task["id"],
                                    new_interval_date,
                                )
                            except Exception as e:
                                raise HTTPException(
                                    400, detail=f"Error assigning task interval, {e}"
                                )

        except UniqueViolationError:
            raise HTTPException(
                status_code=409, detail="Template already assigned to user"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error, {e}")

        return {"message": "Template added to user"}
