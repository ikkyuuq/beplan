from datetime import date, datetime, timedelta
from enum import Enum
from typing import List, Optional

from asyncpg import UniqueViolationError
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from const import types as T
from database import get_db_pool
from utils import date_calculation

router = APIRouter()


class AssignedTask(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    repeat_type: Optional[T.RepeatType] = None
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None


class AssingedGoal(BaseModel):
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


class CreateTemplateFromUserRequest(BaseModel):
    user_id: str
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
    week_interval: Optional[List[int]] = None


class GoalTemplate(BaseModel):
    title: str
    tasks: List[TaskTemplate]


class TemplateResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    image_url: str
    created_by: Optional[str] = "BePlan"
    category: str
    goals: List[GoalTemplate]
    type: TemplateType
    status: TemplateStatus
    duration: int
    is_favorite: bool


@router.get("/")
async def fetch_template(
    user_id: Optional[str] = None, template_id: Optional[int] = None
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

            duration = (
                (templates[0]["due_date"] - templates[0]["start_date"]) + timedelta(1)
            ).days

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

            templates_resp = []
            for tmpl in templates:
                is_favorite = False
                fav_tmpl_rec = await conn.fetchrow(
                    """
                    SELECT * FROM public.favorite_template
                    WHERE user_id = $1
                    AND template_id = $2
                    """,
                    user_id,
                    tmpl["id"],
                )
                if fav_tmpl_rec:
                    is_favorite = True
                else:
                    is_favorite = False
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
                                    week_interval=task_rec.get("interval"),
                                )
                            )
                    goal_templates.append(
                        GoalTemplate(
                            title=goal_rec["title"],
                            tasks=task_templates,
                        )
                    )
                templates_resp.append(
                    TemplateResponse(
                        id=tmpl["id"],
                        title=tmpl["title"],
                        description=tmpl.get("description"),
                        image_url=tmpl["image_url"],
                        created_by=tmpl.get("created_by", "BePlan"),
                        category=tmpl["category"],
                        type=tmpl["type"],
                        goals=goal_templates,
                        status=(
                            TemplateStatus.ASSIGNED
                            if tmpl["id"] in assigned_ids
                            else TemplateStatus.UNUSED
                        ),
                        duration=duration,
                        is_favorite=is_favorite,
                    )
                )

            return templates_resp

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/available_goals")
async def fetch_goal_for_create_template(user_id: str):
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


@router.post("/create")
async def create_template(req: CreateTemplateRequest):
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
                    req.category,
                    req.type,
                    global_start_date,
                    global_due_date,
                )

                for goal in req.goals:
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
                        new_template["id"],
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

                        for interval in interval_dates:
                            await conn.execute(
                                """
                                INSERT INTO public.tmpl_goal_task_interval 
                                    (tmpl_goal_task_id, interval_date)
                                VALUES ($1, $2)
                                """,
                                new_tmpl_goal_task["id"],
                                interval,
                            )
            return {"message": "Template created"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/create/user")
async def create_template_from_user_goals(req: CreateTemplateFromUserRequest):
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
                    req.category,
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

                                for interval in interval_dates:
                                    await conn.execute(
                                        """INSERT INTO tmpl_goal_task_interval
                                           (tmpl_goal_task_id, interval_date)
                                           VALUES ($1, $2)""",
                                        tmpl_goal_task_rec["id"],
                                        interval,
                                    )
                            else:
                                intervals = assigned_task_intervals_dict.get(
                                    (goal["assigned_goal_id"], task_row["id"]), []
                                )
                                for interval_date in intervals:
                                    await conn.execute(
                                        """
                                        INSERT INTO public.tmpl_goal_task_interval
                                            (tmpl_goal_task_id, interval_date)
                                        VALUES ($1, $2)
                                        """,
                                        tmpl_goal_task_rec["id"],
                                        interval_date,
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
                            for interval in interval_dates:
                                await conn.execute(
                                    """
                                    INSERT INTO public.tmpl_goal_task_interval 
                                        (tmpl_goal_task_id, interval_date)
                                    VALUES ($1, $2)
                                    """,
                                    tmpl_goal_task_rec["id"],
                                    interval,
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
    user_id: str
    start_date: date


@router.post("/assign")
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

                        for tmpl_goal_task_interval in tmpl_goal_task_intervals:
                            assign_task = await conn.fetchrow(
                                """
                                INSERT INTO public.assigned_task 
                                    (assigned_goal_id, task_id)
                                VALUES ($1, $2)
                                RETURNING id
                                """,
                                assign_goal["id"],
                                tmpl_goal_task["task_id"],
                            )

                            original_interval_date = tmpl_goal_task_interval[
                                "interval_date"
                            ]
                            new_interval_date = new_start_date_dt + (
                                original_interval_date - original_start_date
                            )

                            await conn.execute(
                                """
                                INSERT INTO public.assigned_task_interval 
                                    (assigned_task_id, interval_date)
                                VALUES ($1, $2)
                                """,
                                assign_task["id"],
                                new_interval_date,
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
async def delete_template(template_id: int):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                await conn.execute(
                    "DELETE FROM public.template WHERE id = $1", template_id
                )

                return {"message": "Template deleted"}

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


class FavoriteTemplateRequest(BaseModel):
    user_id: str
    template_id: int


@router.put("/toggle_favorite")
async def favorite_template(req: FavoriteTemplateRequest):
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
async def get_favorite_templates(user_id: str):
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


# NOTE: Wait for next meeting to discuss the update template logic
@router.put("/update")
async def update_template(req: UpdateTemplateRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                pass

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
