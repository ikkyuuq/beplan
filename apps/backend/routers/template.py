from datetime import date, datetime, timedelta
from enum import Enum
from typing import List, Optional

from asyncpg import UniqueViolationError
from auth import get_current_user_id, is_admin, require_admin
from const import types as T
from database import get_db_pool
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from s3 import make_object_key, upload_public_file
from utils import date_calculation
from utils.users import ensure_user_row
from utils.goal_creation import insert_assigned_task_dates, insert_tmpl_task_dates

import uuid
from uuid import UUID
from datetime import datetime

router = APIRouter()

BASE_URL = "https://beplan.com/templates/"

OFFICIAL_CREATOR = "BePlan"
CATEGORY_ALIASES = {"personal budgeting": "finance"}


def is_official_creator(created_by: Optional[str]) -> bool:
    # Old rows spell it "Beplan", or with a stray Thai mark in front ("ฺBeplan").
    letters = "".join(ch for ch in (created_by or "") if ch.isascii() and ch.isalpha())
    return letters.lower() == OFFICIAL_CREATOR.lower()


def normalize_category(category: Optional[str]) -> str:
    key = (category or "").strip().lower()
    return CATEGORY_ALIASES.get(key, key)


def template_duration(tmpl) -> int:
    return ((tmpl["due_date"] - tmpl["start_date"]) + timedelta(1)).days

class AssignedTask(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    repeat_type: Optional[T.RepeatType] = None
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None


class AssignedGoal(BaseModel):
    id: int
    title: str
    type: T.GoalType
    start_date: date
    due_date: date
    tasks: List[AssignedTask]


class AssignedGoalUpdate(BaseModel):
    assigned_goal_id: int
    new_start_date: Optional[date] = None
    new_due_date: Optional[date] = None


class TemplateType(str, Enum):
    TEMPLATE = "template"
    COMMUNITY = "community"


class TemplateStatus(str, Enum):
    UNUSED = "unused"
    ASSIGNED = "assigned"


class CreateBy(BaseModel):
    user_id: str 
    username: Optional[str] = None
    image: Optional[str] = None
    occupation: Optional[str] = None
    about: Optional[str] = None


class CreateTemplateFromUserRequest(BaseModel):
    user_id: Optional[str] = None  # ignored; taken from the auth token
    title: str
    description: Optional[str] = None
    image_url: str
    created_by: Optional[str] = "BePlan"
    category: str
    type: Optional[TemplateType] = TemplateType.TEMPLATE
    existing_goals: Optional[List[AssignedGoalUpdate]] = []
    new_goals: Optional[List[T.Goal]] = []


class CreateTemplateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    created_by: Optional[str] = "BePlan"
    category: str
    type: Optional[TemplateType] = TemplateType.TEMPLATE
    goals: List[T.Goal]


class GoalUpdate(BaseModel):
    id: int
    title: str
    type: T.GoalType
    start_date: date
    due_date: date
    tasks: List[T.Task]


class UpdateTemplateRequest(BaseModel):
    template_id: int
    title: str
    description: Optional[str] = None
    image_url: str
    category: str
    goals: List[T.Goal]


class FetchTemplateRequest(BaseModel):
    template_id: Optional[int] = None
    user_id: Optional[str] = None


class TaskTemplate(BaseModel):
    title: str
    description: Optional[str] = None
    repeat_type: Optional[T.RepeatType] = None
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None


class GoalTemplate(BaseModel):
    title: str
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    tasks: List[TaskTemplate]


class TemplateResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    image_url: str
    created_by: CreateBy
    category: str
    goals: List[GoalTemplate]
    type: TemplateType
    status: TemplateStatus
    duration: int
    is_favorite: bool
    favorite_count: int = 0

class ShareTemplateRequest(BaseModel):
    template_id: int
    user_id: Optional[str] = None  # ignored; taken from the auth token

class SharedTemplateResponse(BaseModel):
    id: str
    template_id: int
    user_id: str
    url: str
    created_at: datetime

class SharedTemplateURLResponse(BaseModel):
    url: str


@router.get("/")
async def fetch_template(
    template_id: Optional[int] = None,
    user_id: str = Depends(get_current_user_id),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            if template_id is not None:
                templates = await conn.fetch(
                    "SELECT * FROM public.template WHERE id = $1", template_id
                )
            else:
                templates = await conn.fetch("SELECT * FROM public.template")
            if not templates:
                return []

            template_ids = [tmpl["id"] for tmpl in templates]

            assigned_ids = set()
            if user_id:
                assigned = await conn.fetch(
                    "SELECT template_id FROM public.assigned_template WHERE user_id = $1",
                    user_id,
                )
                assigned_ids = {row["template_id"] for row in assigned}
            else:
                assigned = await conn.fetch(
                    "SELECT id FROM public.template WHERE created_by = 'BePlan'"
                )
                assigned_ids = {row["id"] for row in assigned}

            
            user_ids = [tmpl["created_by"] for tmpl in templates]
            users = await conn.fetch(
                "SELECT id, username, image, occupation, about FROM public.user WHERE id = ANY($1)",
                user_ids,
            )
            users_dict = {user["id"]: user for user in users}

            tmpl_goals = await conn.fetch(
                "SELECT * FROM public.tmpl_goal WHERE template_id = ANY($1)",
                template_ids,
            )

            goals_by_template = {}
            goal_ids = set()
            for tmpl_goal in tmpl_goals:
                goals_by_template.setdefault(tmpl_goal["template_id"], []).append(
                    tmpl_goal
                )
                goal_ids.add(tmpl_goal["goal_id"])

            goals_data = await conn.fetch(
                "SELECT * FROM public.goal WHERE id = ANY($1)", list(goal_ids)
            )
            goals_dict = {row["id"]: row for row in goals_data}

            tmpl_goal_ids = [tg["id"] for tg in tmpl_goals]
            tmpl_goal_tasks = await conn.fetch(
                "SELECT * FROM public.tmpl_goal_task WHERE tmpl_goal_id = ANY($1)",
                tmpl_goal_ids,
            )

            tasks_by_tmpl_goal = {}
            task_ids = set()
            for tgt in tmpl_goal_tasks:
                tasks_by_tmpl_goal.setdefault(tgt["tmpl_goal_id"], []).append(tgt)
                task_ids.add(tgt["task_id"])

            tasks_data = await conn.fetch(
                "SELECT * FROM public.task WHERE id = ANY($1)", list(task_ids)
            )
            tasks_dict = {row["id"]: row for row in tasks_data}

            # Monthly and one-off tasks keep their days only as interval rows;
            # return them so the admin editor can save the template unchanged.
            dated_tgt_ids = [
                tgt["id"]
                for tgt in tmpl_goal_tasks
                if tgt["task_id"] in tasks_dict
                and tasks_dict[tgt["task_id"]]["type"] in ("monthly", "date")
            ]
            dates_by_tgt = {}
            if dated_tgt_ids:
                interval_rows = await conn.fetch(
                    """
                    SELECT tmpl_goal_task_id, interval_date
                    FROM public.tmpl_goal_task_interval
                    WHERE tmpl_goal_task_id = ANY($1)
                    ORDER BY interval_date
                    """,
                    dated_tgt_ids,
                )
                for row in interval_rows:
                    dates_by_tgt.setdefault(row["tmpl_goal_task_id"], []).append(
                        row["interval_date"]
                    )

            favorite_template_ids = set()
            if user_id:
                favorites = await conn.fetch(
                    """
                    SELECT template_id FROM public.favorite_template
                    WHERE user_id = $1 AND template_id = ANY($2)
                    """,
                    user_id,
                    template_ids,
                )
                favorite_template_ids = {
                    row["template_id"] for row in favorites
                }

            favorite_counts = await conn.fetch(
                """
                SELECT template_id, COUNT(*) AS n FROM public.favorite_template
                WHERE template_id = ANY($1) GROUP BY template_id
                """,
                template_ids,
            )
            favorite_count_by_id = {row["template_id"]: row["n"] for row in favorite_counts}

            templates_resp = []
            for tmpl in templates:
                user_info = (
                    {} if is_official_creator(tmpl["created_by"])
                    else users_dict.get(tmpl["created_by"], {})
                )
                created_by = CreateBy(
                    user_id=user_info.get("id", OFFICIAL_CREATOR),
                    username=user_info.get("username"),
                    image=user_info.get("image"),
                    occupation=user_info.get("occupation"),
                    about=user_info.get("about"),
                )

                goal_templates = []
                for tmpl_goal in goals_by_template.get(tmpl["id"], []):
                    goal_rec = goals_dict.get(tmpl_goal["goal_id"])
                    if not goal_rec:
                        continue
                    task_templates = []
                    for tmpl_goal_task in tasks_by_tmpl_goal.get(tmpl_goal["id"], []):
                        task_rec = tasks_dict.get(tmpl_goal_task["task_id"])
                        if task_rec:
                            task_templates.append(
                                TaskTemplate(
                                    title=task_rec["title"],
                                    description=task_rec.get("description"),
                                    repeat_type=task_rec["type"],
                                    date_interval=dates_by_tgt.get(tmpl_goal_task["id"]),
                                    week_interval=task_rec.get("interval"),
                                )
                            )
                    goal_templates.append(
                        GoalTemplate(
                            title=goal_rec["title"],
                            start_date=tmpl_goal.get("start_date"),
                            due_date=tmpl_goal.get("due_date"),
                            tasks=task_templates,
                        )
                    )
                templates_resp.append(
                    TemplateResponse(
                        id=tmpl["id"],
                        title=tmpl["title"],
                        description=tmpl.get("description"),
                        image_url=tmpl.get("image_url", "https://example.com/default-image.jpg"),  # ใช้ค่าเริ่มต้น
                        created_by=created_by,
                        category=normalize_category(tmpl["category"]),
                        type=tmpl["type"],
                        goals=goal_templates,
                        status=(
                            TemplateStatus.ASSIGNED
                            if tmpl["id"] in assigned_ids
                            else TemplateStatus.UNUSED
                        ),
                        duration=template_duration(tmpl),
                        is_favorite=tmpl["id"] in favorite_template_ids,
                        favorite_count=favorite_count_by_id.get(tmpl["id"], 0),
                    )
                )

            return templates_resp

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/available_goals")
async def fetch_goal_for_create_template(
    user_id: str = Depends(get_current_user_id),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            goals_rec = await conn.fetch(
                """
                SELECT ag.id, ag.start_date, ag.due_date, g.title
                FROM public.goal g
                JOIN public.assigned_goal ag ON g.id = ag.goal_id
                WHERE ag.user_id = $1
                AND g.type = 'custom goal'
                """,
                user_id,
            )

            goals = {
                row["id"]: {
                    "title": row["title"],
                    "start_date": row["start_date"],
                    "due_date": row["due_date"],
                }
                for row in goals_rec
            }

            return goals

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/upload_image")
async def upload_image(
    file: UploadFile = File(...), user_id: str = Depends(get_current_user_id)
):
    key = make_object_key("templates", user_id, file.filename)
    return await upload_public_file(file, key)


async def insert_template_goals(conn, template_id: int, goals: List[T.Goal]):
    """Insert a template's goals and tasks, with each task's dates."""
    for goal in goals:
        new_goal = await conn.fetchrow(
            "INSERT INTO public.goal (title, type) VALUES ($1, $2) RETURNING id",
            goal.title,
            goal.type,
        )

        new_tmpl_goal = await conn.fetchrow(
            """
            INSERT INTO public.tmpl_goal 
                (template_id, goal_id, start_date, due_date)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            template_id,
            new_goal["id"],
            goal.start_date,
            goal.due_date,
        )

        for task in goal.tasks:
            if task.repeat_type == T.RepeatType.DAILY:
                interval_dates = date_calculation.get_daily_range(
                    goal.start_date, goal.due_date
                )
            elif task.repeat_type == T.RepeatType.WEEKLY:
                if not task.week_interval:
                    raise HTTPException(
                        400, detail="Week interval is required"
                    )
                interval_dates = date_calculation.get_weekly_range(
                    goal.start_date, goal.due_date, task.week_interval
                )
            elif (
                task.repeat_type == T.RepeatType.MONTHLY
                or task.repeat_type == T.RepeatType.DATE
            ):
                if not task.date_interval:
                    raise HTTPException(
                        400, detail="Monthly interval is required"
                    )
                interval_dates = task.date_interval
            else:
                raise HTTPException(
                    400,
                    detail="Invalid task type; must be daily, weekly, or monthly",
                )

            new_task = await conn.fetchrow(
                """
                INSERT INTO public.task 
                    (title, description, goal_id, type, interval)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
                """,
                task.title,
                task.description,
                new_goal["id"],
                task.repeat_type,
                task.week_interval if task.week_interval else None,
            )

            new_tmpl_goal_task = await conn.fetchrow(
                """
                INSERT INTO public.tmpl_goal_task 
                    (tmpl_goal_id, task_id)
                VALUES ($1, $2)
                RETURNING id
                """,
                new_tmpl_goal["id"],
                new_task["id"],
            )

            await insert_tmpl_task_dates(
                conn, new_tmpl_goal_task["id"], interval_dates
            )


@router.post("/create")
async def create_template(
    req: CreateTemplateRequest, _admin_id: str = Depends(require_admin)
):
    # Templates created here are official BePlan templates.
    req.created_by = "BePlan"
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                global_start_date = min(goal.start_date for goal in req.goals)
                global_due_date = max(goal.due_date for goal in req.goals)

                new_template = await conn.fetchrow(
                    """
                    INSERT INTO public.template 
                        (title, description, image_url, created_by, category, type, start_date, due_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                    """,
                    req.title,
                    req.description,
                    req.image_url,
                    req.created_by,
                    normalize_category(req.category),
                    req.type,
                    global_start_date,
                    global_due_date,
                )

                await insert_template_goals(conn, new_template["id"], req.goals)
            return {"message": "Template created"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/create/user")
async def create_template_from_user_goals(
    req: CreateTemplateFromUserRequest, user_id: str = Depends(get_current_user_id)
):
    req.user_id = user_id
    req.created_by = user_id
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                existing_goals_data = []
                updated_assigned_ids = set()
                if req.existing_goals:
                    update_mapping = {}
                    for eg in req.existing_goals:
                        if (
                            eg.new_start_date is not None
                            and eg.new_due_date is not None
                        ):
                            update_mapping[eg.assigned_goal_id] = (
                                eg.new_start_date,
                                eg.new_due_date,
                            )
                            updated_assigned_ids.add(eg.assigned_goal_id)
                        else:
                            rec = await conn.fetchrow(
                                """
                                SELECT start_date, due_date
                                FROM public.assigned_goal
                                WHERE id = $1
                                """,
                                eg.assigned_goal_id,
                            )
                            update_mapping[eg.assigned_goal_id] = (
                                rec["start_date"],
                                rec["due_date"],
                            )
                    existing_ids = list(update_mapping.keys())
                    db_existing = await conn.fetch(
                        """
                        SELECT ag.id AS assigned_goal_id, g.id AS goal_id, g.title
                        FROM public.goal g
                        JOIN public.assigned_goal ag ON g.id = ag.goal_id
                        WHERE ag.user_id = $1 AND ag.id = ANY($2)
                        """,
                        req.user_id,
                        existing_ids,
                    )
                    if not db_existing:
                        raise HTTPException(
                            400, detail="No assigned goals found for the provided IDs"
                        )
                    for record in db_existing:
                        assigned_goal_id = record["assigned_goal_id"]
                        new_start_date, new_due_date = update_mapping[assigned_goal_id]
                        existing_goals_data.append(
                            {
                                "goal_id": record["goal_id"],
                                "assigned_goal_id": assigned_goal_id,
                                "start_date": new_start_date,
                                "due_date": new_due_date,
                            }
                        )

                new_goals_data = []
                if req.new_goals:
                    for goal in req.new_goals:
                        new_goal_rec = await conn.fetchrow(
                            "INSERT INTO public.goal (title, type) VALUES ($1, $2) RETURNING id",
                            goal.title,
                            goal.type,
                        )
                        if not new_goal_rec:
                            raise HTTPException(
                                500, detail="Failed to create a new goal"
                            )
                        new_goals_data.append(
                            {
                                "goal_id": new_goal_rec["id"],
                                "start_date": goal.start_date,
                                "due_date": goal.due_date,
                                "tasks": goal.tasks,
                            }
                        )

                all_start_dates = [g["start_date"] for g in existing_goals_data] + [
                    g["start_date"] for g in new_goals_data
                ]
                all_due_dates = [g["due_date"] for g in existing_goals_data] + [
                    g["due_date"] for g in new_goals_data
                ]
                if not all_start_dates or not all_due_dates:
                    raise HTTPException(400, detail="No goals provided")
                global_start_date = min(all_start_dates)
                global_due_date = max(all_due_dates)

                new_template = await conn.fetchrow(
                    """
                    INSERT INTO public.template 
                        (title, description, image_url, created_by, category, type, start_date, due_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                    """,
                    req.title,
                    req.description,
                    req.image_url,
                    req.created_by,
                    normalize_category(req.category),
                    req.type,
                    global_start_date,
                    global_due_date,
                )
                if not new_template:
                    raise HTTPException(500, detail="Failed to create template")

                if existing_goals_data:
                    existing_assigned_ids = [
                        g["assigned_goal_id"] for g in existing_goals_data
                    ]
                    existing_assigned_task_intervals_rec = await conn.fetch(
                        """
                        SELECT ati.interval_date, t.id AS task_id, at.assigned_goal_id
                        FROM public.assigned_task_interval ati
                        JOIN public.assigned_task at ON ati.assigned_task_id = at.id
                        JOIN public.task t ON at.task_id = t.id
                        WHERE at.assigned_goal_id = ANY($1)
                        """,
                        existing_assigned_ids,
                    )
                    assigned_task_intervals_dict = {}
                    for row in existing_assigned_task_intervals_rec:
                        key = (row["assigned_goal_id"], row["task_id"])
                        assigned_task_intervals_dict.setdefault(key, []).append(
                            row["interval_date"]
                        )

                    for goal in existing_goals_data:
                        tmpl_goal_rec = await conn.fetchrow(
                            """
                            INSERT INTO public.tmpl_goal 
                                (template_id, goal_id, start_date, due_date)
                            VALUES ($1, $2, $3, $4)
                            RETURNING id
                            """,
                            new_template["id"],
                            goal["goal_id"],
                            goal["start_date"],
                            goal["due_date"],
                        )
                        if not tmpl_goal_rec:
                            raise HTTPException(
                                500, detail="Failed to create template goal"
                            )
                        tasks_rec = await conn.fetch(
                            "SELECT id, type, interval FROM public.task WHERE goal_id = $1",
                            goal["goal_id"],
                        )
                        for task_row in tasks_rec:
                            tmpl_goal_task_rec = await conn.fetchrow(
                                """
                                INSERT INTO public.tmpl_goal_task 
                                    (tmpl_goal_id, task_id)
                                VALUES ($1, $2)
                                RETURNING id
                                """,
                                tmpl_goal_rec["id"],
                                task_row["id"],
                            )
                            if not tmpl_goal_task_rec:
                                raise HTTPException(
                                    500, detail="Failed to create template goal task"
                                )
                            if goal["assigned_goal_id"] in updated_assigned_ids:
                                task_type = task_row["type"]
                                weekly_interval = task_row["interval"]

                                if task_type == T.RepeatType.DAILY:
                                    interval_dates = date_calculation.get_daily_range(
                                        goal["start_date"], goal["due_date"]
                                    )
                                elif task_type == T.RepeatType.WEEKLY:
                                    interval_dates = date_calculation.get_weekly_range(
                                        goal["start_date"],
                                        goal["due_date"],
                                        weekly_interval,
                                    )
                                elif task_type == T.RepeatType.MONTHLY:
                                    existing_intervals = (
                                        assigned_task_intervals_dict.get(
                                            (goal["assigned_goal_id"], task_row["id"]),
                                            [],
                                        )
                                    )
                                    days = {d.day for d in existing_intervals}

                                    if not days:
                                        raise HTTPException(
                                            400,
                                            detail=f"Monthly task {task_row['id']} has no existing intervals to base calculation on",
                                        )

                                    interval_dates = []
                                    start_date = goal["start_date"]
                                    due_date = goal["due_date"]

                                    for day in days:
                                        current_month = start_date.replace(day=1)
                                        while current_month <= due_date:
                                            try:
                                                date = current_month.replace(day=day)
                                                if start_date <= date <= due_date:
                                                    interval_dates.append(date)
                                            except ValueError:
                                                pass
                                            current_month += relativedelta(months=1)

                                    interval_dates.sort()
                                else:
                                    raise HTTPException(
                                        400,
                                        detail="Invalid task type; must be daily, weekly, or monthly",
                                    )

                                await insert_tmpl_task_dates(
                                    conn, tmpl_goal_task_rec["id"], interval_dates
                                )
                            else:
                                intervals = assigned_task_intervals_dict.get(
                                    (goal["assigned_goal_id"], task_row["id"]), []
                                )
                                await insert_tmpl_task_dates(
                                    conn, tmpl_goal_task_rec["id"], intervals
                                )

                if new_goals_data:
                    for goal in new_goals_data:
                        tmpl_goal_rec = await conn.fetchrow(
                            """
                            INSERT INTO public.tmpl_goal 
                                (template_id, goal_id, start_date, due_date)
                            VALUES ($1, $2, $3, $4)
                            RETURNING id
                            """,
                            new_template["id"],
                            goal["goal_id"],
                            goal["start_date"],
                            goal["due_date"],
                        )
                        if not tmpl_goal_rec:
                            raise HTTPException(
                                500,
                                detail="Failed to create template goal for new goal",
                            )
                        for task in goal["tasks"]:
                            if task.repeat_type == T.RepeatType.DAILY:
                                interval_dates = date_calculation.get_daily_range(
                                    goal["start_date"], goal["due_date"]
                                )
                            elif task.repeat_type == T.RepeatType.WEEKLY:
                                if not task.week_interval:
                                    raise HTTPException(
                                        400, detail="Week interval is required"
                                    )
                                interval_dates = date_calculation.get_weekly_range(
                                    goal["start_date"],
                                    goal["due_date"],
                                    task.week_interval,
                                )
                            elif task.repeat_type == T.RepeatType.MONTHLY:
                                if not task.date_interval:
                                    raise HTTPException(
                                        400, detail="Monthly interval is required"
                                    )
                                interval_dates = task.date_interval
                            else:
                                raise HTTPException(
                                    400,
                                    detail="Invalid task type; must be daily, weekly, or monthly",
                                )

                            # Create new task record for the new goal
                            new_task_rec = await conn.fetchrow(
                                """
                                INSERT INTO public.task 
                                    (title, description, goal_id, type, interval)
                                VALUES ($1, $2, $3, $4, $5)
                                RETURNING id
                                """,
                                task.title,
                                task.description,
                                goal["goal_id"],
                                task.repeat_type,
                                task.week_interval if task.week_interval else None,
                            )
                            tmpl_goal_task_rec = await conn.fetchrow(
                                """
                                INSERT INTO public.tmpl_goal_task 
                                    (tmpl_goal_id, task_id)
                                VALUES ($1, $2)
                                RETURNING id
                                """,
                                tmpl_goal_rec["id"],
                                new_task_rec["id"],
                            )
                            await insert_tmpl_task_dates(
                                conn, tmpl_goal_task_rec["id"], interval_dates
                            )

                return {
                    "message": "Template created from user goals",
                    "template_id": new_template["id"],
                }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


class AssignTemplateRequest(BaseModel):
    template_id: int
    user_id: Optional[str] = None  # ignored; taken from the auth token
    start_date: date


@router.post("/assign")
async def assign_template(
    req: AssignTemplateRequest, user_id: str = Depends(get_current_user_id)
):
    req.user_id = user_id
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

                tmpl_goals = await conn.fetch(
                    "SELECT * FROM public.tmpl_goal WHERE template_id = $1",
                    req.template_id,
                )

                dates = await conn.fetchrow(
                    "SELECT start_date, due_date FROM public.template WHERE id = $1",
                    req.template_id,
                )
                if not dates:
                    raise HTTPException(400, detail="Template not found")

                original_start_date = dates["start_date"]
                original_due_date = dates["due_date"]
                delta = original_due_date - original_start_date

                new_start_date_dt = req.start_date
                new_due_date_dt = new_start_date_dt + delta

                for tmpl_goal in tmpl_goals:
                    assign_goal = await conn.fetchrow(
                        """
                        INSERT INTO public.assigned_goal 
                            (user_id, goal_id, start_date, due_date)
                        VALUES ($1, $2, $3, $4)
                        RETURNING id
                        """,
                        req.user_id,
                        tmpl_goal["goal_id"],
                        new_start_date_dt,
                        new_due_date_dt,
                    )

                    tmpl_goal_tasks = await conn.fetch(
                        "SELECT * FROM public.tmpl_goal_task WHERE tmpl_goal_id = $1",
                        tmpl_goal["id"],
                    )

                    for tmpl_goal_task in tmpl_goal_tasks:
                        tmpl_goal_task_intervals = await conn.fetch(
                            "SELECT * FROM public.tmpl_goal_task_interval WHERE tmpl_goal_task_id = $1",
                            tmpl_goal_task["id"],
                        )

                        # Shift each template date so the plan starts on the chosen start date.
                        await insert_assigned_task_dates(
                            conn,
                            assign_goal["id"],
                            tmpl_goal_task["task_id"],
                            [
                                new_start_date_dt
                                + (row["interval_date"] - original_start_date)
                                for row in tmpl_goal_task_intervals
                            ],
                        )
            return {"message": "Template added to user"}

        except UniqueViolationError:
            raise HTTPException(
                status_code=409, detail="Template already assigned to user"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.delete("/delete")
async def delete_template(
    template_id: int, user_id: str = Depends(get_current_user_id)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                created_by = await conn.fetchval(
                    "SELECT created_by FROM public.template WHERE id = $1", template_id
                )
                if created_by is None:
                    raise HTTPException(status_code=404, detail="Template not found")
                # Creators may delete their own templates; admins may delete any.
                if created_by != user_id and not await is_admin(user_id):
                    raise HTTPException(
                        status_code=403, detail="Not allowed to delete this template"
                    )
                await conn.execute(
                    "DELETE FROM public.template WHERE id = $1", template_id
                )

                return {"message": "Template deleted"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


class FavoriteTemplateRequest(BaseModel):
    user_id: Optional[str] = None  # ignored; taken from the auth token
    template_id: int


@router.put("/toggle_favorite")
async def favorite_template(
    req: FavoriteTemplateRequest, user_id: str = Depends(get_current_user_id)
):
    req.user_id = user_id
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                existing = await conn.fetchrow(
                    """
                    SELECT * FROM public.favorite_template
                    WHERE user_id = $1
                    AND template_id = $2
                """,
                    req.user_id,
                    req.template_id,
                )
                if existing:
                    await conn.execute(
                        """
                        DELETE FROM public.favorite_template
                        WHERE user_id = $1
                        AND template_id = $2
                    """,
                        req.user_id,
                        req.template_id,
                    )
                    return {"message": "Template unfavorited"}
                else:
                    await conn.execute(
                        """
                        INSERT INTO public.favorite_template (user_id, template_id)
                        VALUES ($1, $2)
                        """,
                        req.user_id,
                        req.template_id,
                    )
                    return {"message": "Template favorited"}

        except UniqueViolationError:
            raise HTTPException(
                status_code=409, detail="Template already favorited by user"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.get("/favorite/{user_id}")
async def get_favorite_templates(
    user_id: str, current_user_id: str = Depends(get_current_user_id)
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not allowed to view these favorites")
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            fav_templates = await conn.fetch(
                """
                SELECT t.id, t.title, t.description, t.image_url, t.created_by, t.category, t.type
                FROM public.template t
                JOIN public.favorite_template ft ON t.id = ft.template_id
                WHERE ft.user_id = $1
                """,
                user_id,
            )

            if not fav_templates:
                return []

            return fav_templates

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")



@router.put("/update")
async def update_template(
    req: UpdateTemplateRequest, _admin_id: str = Depends(require_admin)
):
    if not req.goals:
        raise HTTPException(400, detail="A template needs at least one goal")
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                updated = await conn.fetchval(
                    """
                    UPDATE public.template
                    SET title = $2, description = $3, image_url = $4, category = $5,
                        start_date = $6, due_date = $7
                    WHERE id = $1
                    RETURNING id
                    """,
                    req.template_id,
                    req.title,
                    req.description,
                    req.image_url,
                    normalize_category(req.category),
                    min(goal.start_date for goal in req.goals),
                    max(goal.due_date for goal in req.goals),
                )
                if updated is None:
                    raise HTTPException(status_code=404, detail="Template not found")

                # Rebuild the goals. Users who already used this template keep
                # their plans: assigned_goal points at the same goal rows, and
                # deleting a goal cascades to assigned_goal, so old goal rows are
                # only deleted when nobody has them.
                old_goal_ids = await conn.fetch(
                    "DELETE FROM public.tmpl_goal WHERE template_id = $1 RETURNING goal_id",
                    req.template_id,
                )
                await conn.execute(
                    """
                    DELETE FROM public.goal g
                    WHERE g.id = ANY($1::int[])
                      AND NOT EXISTS (SELECT 1 FROM public.assigned_goal ag WHERE ag.goal_id = g.id)
                      AND NOT EXISTS (SELECT 1 FROM public.tmpl_goal tg WHERE tg.goal_id = g.id)
                    """,
                    [row["goal_id"] for row in old_goal_ids],
                )
                await insert_template_goals(conn, req.template_id, req.goals)
            return {"message": "Template updated"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

# Make template shareable by generate URL
@router.post("/shared_template",response_model = SharedTemplateResponse)
async def shared_template(
    req: ShareTemplateRequest, user_id: str = Depends(get_current_user_id)
):
    "Generate template unique shareabel URL"
    req.user_id = user_id
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        unique_id = str(uuid.uuid4())
        share_url = f"{BASE_URL}/{unique_id}"

        try:
            await ensure_user_row(conn, user_id)  # shared_tmpl references public.user
            row = await conn.fetchrow(
                """
                INSERT INTO  public.shared_tmpl (id, template_id, user_id, URL, created_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING id, template_id, user_id , URL, created_at
                """,
                unique_id,
                req.template_id,
                req.user_id,
                share_url
            )

            if not row:
                raise HTTPException(status_code=500, detail="Failed to insert shared template")
            
            return SharedTemplateResponse(
                id=str(row["id"]),
                template_id=row["template_id"],
                user_id=row["user_id"],
                url=row["url"],
                created_at=row["created_at"],
            )
        
        except Exception as e:
            raise   HTTPException(status_code=500, detail=f"Error sharing template: {str(e)}")

@router.get("/shared/{id}", response_model=SharedTemplateURLResponse)
async def get_shared_template(id: str):
    """Fetches shared template details using the unique template URL ID."""
    try:
        id = str(UUID(id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid template ID format")
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT url FROM public.shared_tmpl WHERE id = $1
            """,
            id
        )

        if not row:
            raise HTTPException(status_code=404, detail="Template not found")

        return SharedTemplateURLResponse(
            url = row["url"],
        )