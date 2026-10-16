"""Goal drafts: goals the user is still planning.

A draft is fully editable and has no scheduled days, so it never shows up in
the schedule, analysis or goal counts. Starting it validates the plan and
creates the real goal with the normal create logic (then the draft is gone).
Started goals keep their limited editing.

The draft body is the editor's own task format (type "normal" = specific
dates, monthlyMode for monthly tasks) so the app saves exactly what it shows.
"""

import calendar
import json
from datetime import date, datetime, timedelta
from typing import List, Literal, Optional

from auth import get_current_user_id
from const import types as T
from database import get_db_pool
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from utils import goal_creation
from utils.client_date import get_client_today
from utils.users import ensure_user_row

router = APIRouter()


class DraftTask(BaseModel):
    title: str = ""
    description: Optional[str] = None
    type: Literal["normal", "daily", "weekly", "monthly"] = "normal"
    selectedDates: List[date] = []
    selectedDaysOfWeek: List[int] = []
    monthlyMode: Optional[Literal["start", "mid", "end"]] = None


class DraftGoal(BaseModel):
    title: str = ""
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    tasks: List[DraftTask] = []


def monthly_dates(start: date, due: date, mode: str) -> List[date]:
    """One day per month (1st, middle or last day) within [start, due].

    Mirrors the editor's calculateMonthlyDates, so a draft started later than
    planned still gets the right days of the month.
    """
    days, year, month = [], start.year, start.month
    while (year, month) <= (due.year, due.month):
        last = calendar.monthrange(year, month)[1]
        day = 1 if mode == "start" else last if mode == "end" else -(-last // 2)
        candidate = date(year, month, day)
        if start <= candidate <= due:
            days.append(candidate)
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return days


def build_goal(draft: DraftGoal, today: date) -> T.Goal:
    """Validate a draft and turn it into a goal to create.

    If the planned start date has already passed, the goal starts today and
    keeps its length (specific dates move by the same number of days).
    """
    if not draft.title.strip():
        raise HTTPException(400, detail="Give the goal a title before starting it.")
    if not draft.start_date or not draft.due_date:
        raise HTTPException(400, detail="Set the start and end dates before starting.")
    if draft.due_date < draft.start_date:
        raise HTTPException(400, detail="The end date can't be before the start date.")
    if not draft.tasks:
        raise HTTPException(400, detail="Add at least one task before starting.")

    shift = timedelta(days=max(0, (today - draft.start_date).days))
    start, due = draft.start_date + shift, draft.due_date + shift

    tasks = []
    for task in draft.tasks:
        if not task.title.strip():
            raise HTTPException(400, detail="Every task needs a title.")
        name = f'"{task.title.strip()}"'
        if task.type == "normal":
            dates = sorted({d + shift for d in task.selectedDates if start <= d + shift <= due})
            if not dates:
                raise HTTPException(400, detail=f"{name} has no dates within the goal's dates.")
            tasks.append(T.Task(title=task.title, description=task.description,
                                repeat_type=T.RepeatType.DATE, date_interval=dates))
        elif task.type == "monthly":
            dates = monthly_dates(start, due, task.monthlyMode or "start")
            if not dates:
                raise HTTPException(400, detail=f"{name} has no monthly dates within the goal's dates.")
            tasks.append(T.Task(title=task.title, description=task.description,
                                repeat_type=T.RepeatType.MONTHLY, date_interval=dates))
        elif task.type == "weekly":
            if not task.selectedDaysOfWeek:
                raise HTTPException(400, detail=f"Pick at least one weekday for {name}.")
            tasks.append(T.Task(title=task.title, description=task.description,
                                repeat_type=T.RepeatType.WEEKLY,
                                week_interval=sorted(set(task.selectedDaysOfWeek))))
        else:
            tasks.append(T.Task(title=task.title, description=task.description,
                                repeat_type=T.RepeatType.DAILY))

    return T.Goal(title=draft.title.strip(), start_date=start, due_date=due, tasks=tasks)


def _row_to_draft(row) -> dict:
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    updated = row["updated_at"]
    return {
        "id": row["id"],
        "updated_at": updated.isoformat() if isinstance(updated, datetime) else updated,
        **payload,
    }


@router.get("")
async def list_drafts(user_id: str = Depends(get_current_user_id)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, payload, updated_at FROM public.goal_draft
            WHERE user_id = $1 ORDER BY updated_at DESC, id DESC
            """,
            user_id,
        )
        return [_row_to_draft(row) for row in rows]


@router.post("")
async def create_draft(draft: DraftGoal, user_id: str = Depends(get_current_user_id)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await ensure_user_row(conn, user_id)  # goal_draft references public.user
        draft_id = await conn.fetchval(
            """
            INSERT INTO public.goal_draft (user_id, payload)
            VALUES ($1, $2::jsonb) RETURNING id
            """,
            user_id,
            json.dumps(draft.model_dump(mode="json")),
        )
        return {"id": draft_id}


@router.put("/{draft_id}")
async def update_draft(
    draft_id: int, draft: DraftGoal, user_id: str = Depends(get_current_user_id)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        res = await conn.execute(
            """
            UPDATE public.goal_draft SET payload = $3::jsonb, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            """,
            draft_id,
            user_id,
            json.dumps(draft.model_dump(mode="json")),
        )
        if res != "UPDATE 1":
            raise HTTPException(status_code=404, detail="Draft not found")
        return {"id": draft_id}


@router.delete("/{draft_id}")
async def delete_draft(draft_id: int, user_id: str = Depends(get_current_user_id)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        res = await conn.execute(
            "DELETE FROM public.goal_draft WHERE id = $1 AND user_id = $2", draft_id, user_id
        )
        if res != "DELETE 1":
            raise HTTPException(status_code=404, detail="Draft not found")
        return {"status": "deleted"}


@router.post("/{draft_id}/start")
async def start_draft(
    draft_id: int,
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    """Create the real goal from a draft and remove the draft (one transaction)."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT payload FROM public.goal_draft
                WHERE id = $1 AND user_id = $2
                FOR UPDATE
                """,
                draft_id,
                user_id,
            )
            if not row:
                raise HTTPException(status_code=404, detail="Draft not found")
            payload = row["payload"]
            draft = DraftGoal.model_validate(
                json.loads(payload) if isinstance(payload, str) else payload
            )
            goal = build_goal(draft, client_today)
            await goal_creation.Create(conn, T.GoalCreateRequest(goal=goal), user_id)
            await conn.execute("DELETE FROM public.goal_draft WHERE id = $1", draft_id)

        return {
            "status": "started",
            "start_date": goal.start_date.isoformat(),
            "due_date": goal.due_date.isoformat(),
            "shifted_days": (goal.start_date - draft.start_date).days,
        }
