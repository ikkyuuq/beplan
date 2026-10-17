import logging
from datetime import date, timedelta
from typing import List, Optional

from auth import get_current_user_id
from const import types as T
from database import get_db_pool
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from utils import goal_creation
from utils.client_date import get_client_today

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TaskUpdate(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    repeat_type: Optional[T.RepeatType] = None
    date_interval: Optional[List[date]] = None
    week_interval: Optional[List[int]] = None
    status: Optional[T.Status] = None


class GoalUpdate(BaseModel):
    id: int
    title: str
    type: str = Field(default="custom goal")
    start_date: date
    due_date: date
    tasks: List[TaskUpdate]


class FetchTask(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: T.Status


class FetchGoal(BaseModel):
    id: int
    title: str
    type: str
    status: T.Status
    start_date: date
    due_date: date
    tasks: List[FetchTask] = []


class GoalUpdateRequest(BaseModel):
    user_id: Optional[str] = None  # ignored; taken from the auth token
    assigned_goal_id: int
    goal: GoalUpdate


class TaskUpdateRequest(BaseModel):
    to: T.Status
    user_id: Optional[str] = None  # ignored; taken from the auth token
    assigned_task_id: List[int]


router = APIRouter()


@router.post("/create")
async def create_goal(
    req: T.GoalCreateRequest, user_id: str = Depends(get_current_user_id)
):
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await goal_creation.Create(conn, req, user_id)
        return JSONResponse(
            content={
                "status": "success",
                "message": "Goal with tasks created successfully",
            }
        )
    except ValueError as e:
        logger.error(f"ValueError: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=400)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return JSONResponse(
            content={"error": f"Unexpected error: {str(e)}"}, status_code=500
        )


async def _delete_upcoming_pending(conn, assigned_goal_id: int, task_id: int, from_date: date):
    """Delete a task's *pending* days on or after from_date (they get rebuilt).

    Done/failed days and anything before from_date are history and stay.
    """
    rows = await conn.fetch(
        """
        SELECT at.id
        FROM public.assigned_task at
        JOIN public.assigned_task_interval ati ON ati.assigned_task_id = at.id
        WHERE at.assigned_goal_id = $1
        AND at.task_id = $2
        AND at.status = 'pending'
        AND ati.interval_date >= $3
        """,
        assigned_goal_id,
        task_id,
        from_date,
    )
    ids = [row["id"] for row in rows]
    if not ids:
        return
    await conn.execute(
        "DELETE FROM public.assigned_task_interval WHERE assigned_task_id = ANY($1)", ids
    )
    await conn.execute("DELETE FROM public.assigned_task WHERE id = ANY($1)", ids)


@router.put("/update")
async def update_goal(
    req: GoalUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    """Save an edited goal without rewriting its history.

    Rules (today = the user's local date, see get_client_today):
    - Titles, descriptions and the goal type are updated in place.
    - Only *pending* days from today on are rebuilt from the new schedule;
      done/failed days and earlier days are never touched or recreated.
    - A removed task stops its upcoming days; its past results are kept.
    - New tasks are scheduled from today (or the start date, if later).
    - The start date can't change once the goal has started, and a started
      goal's end date can't move before today.
    (Previously every assigned task was deleted and recreated from the start
    date, which reset completed tasks to pending and refailed the past.)
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                # Lock the goal so two saves can't interleave; also checks ownership.
                saved = await conn.fetchrow(
                    """
                    SELECT start_date, due_date
                    FROM public.assigned_goal
                    WHERE id = $1 AND goal_id = $2 AND user_id = $3
                    FOR UPDATE
                    """,
                    req.assigned_goal_id,
                    req.goal.id,
                    user_id,
                )
                if not saved:
                    raise HTTPException(status_code=404, detail="Goal not found for this user")

                new_start, new_due = req.goal.start_date, req.goal.due_date
                if new_due < new_start:
                    raise HTTPException(400, detail="The end date can't be before the start date.")
                started = saved["start_date"] <= client_today
                if started and new_start != saved["start_date"]:
                    raise HTTPException(
                        400, detail="The start date can't change after the goal has started."
                    )
                if started and new_due < client_today:
                    raise HTTPException(
                        400, detail="The end date can't be before today for a goal that has started."
                    )

                await conn.execute(
                    """
                    UPDATE public.assigned_goal
                    SET start_date = $1, due_date = $2, updated_at = NOW()
                    WHERE id = $3
                    """,
                    new_start,
                    new_due,
                    req.assigned_goal_id,
                )
                await conn.execute(
                    """
                    UPDATE public.goal
                    SET title = $1, type = $2, updated_at = NOW()
                    WHERE id = $3
                    """,
                    req.goal.title,
                    req.goal.type,
                    req.goal.id,
                )

                # First day whose (pending) tasks may be rebuilt.
                from_date = max(client_today, new_start)

                for task in req.goal.tasks:
                    if task.id:
                        owned = await conn.fetchval(
                            "SELECT 1 FROM public.task WHERE id = $1 AND goal_id = $2",
                            task.id,
                            req.goal.id,
                        )
                        if not owned:
                            raise HTTPException(
                                status_code=404, detail=f"Task with id {task.id} not found"
                            )
                        await _delete_upcoming_pending(
                            conn, req.assigned_goal_id, task.id, client_today
                        )

                    if task.status == T.Status.DELETED:
                        # Removed: no upcoming days; its history stays.
                        continue

                    if task.id:
                        await conn.execute(
                            """
                            UPDATE public.task
                            SET title = $1, description = $2, type = $3, interval = $4, updated_at = NOW()
                            WHERE id = $5 AND goal_id = $6
                            """,
                            task.title,
                            task.description,
                            task.repeat_type,
                            task.week_interval if task.week_interval else None,
                            task.id,
                            req.goal.id,
                        )
                    else:
                        task.id = await conn.fetchval(
                            """
                            INSERT INTO public.task (title, description, goal_id, interval, type)
                            VALUES ($1, $2, $3, $4, $5)
                            RETURNING id
                            """,
                            task.title,
                            task.description,
                            req.goal.id,
                            task.week_interval if task.week_interval else None,
                            task.repeat_type,
                        )

                    # Days this task still has (history, or anything before today):
                    # never schedule a second record on the same day.
                    kept = {
                        row["interval_date"]
                        for row in await conn.fetch(
                            """
                            SELECT ati.interval_date
                            FROM public.assigned_task at
                            JOIN public.assigned_task_interval ati ON ati.assigned_task_id = at.id
                            WHERE at.assigned_goal_id = $1 AND at.task_id = $2
                            """,
                            req.assigned_goal_id,
                            task.id,
                        )
                    }
                    schedule = await goal_creation.get_interval_dates(task, new_start, new_due)
                    upcoming = sorted(
                        {d for d in schedule if from_date <= d <= new_due} - kept
                    )
                    await goal_creation.insert_assigned_task_dates(
                        conn, req.assigned_goal_id, task.id, upcoming
                    )

                # A settled goal that has pending days again (e.g. extended) is
                # running again; then settle it if nothing is pending anymore.
                await conn.execute(
                    """
                    UPDATE public.assigned_goal
                    SET status = 'pending'
                    WHERE id = $1
                    AND status <> 'pending'
                    AND EXISTS (
                        SELECT 1 FROM public.assigned_task
                        WHERE assigned_goal_id = $1 AND status = 'pending'
                    )
                    """,
                    req.assigned_goal_id,
                )
                await check_goal_status(conn, req.assigned_goal_id)

            return JSONResponse(
                content={
                    "status": "success",
                    "message": "Goal and related tasks updated successfully",
                }
            )

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JSONResponse(
                content={"error": f"Unexpected error: {str(e)}"}, status_code=500
            )


class GoalSummary(BaseModel):
    id: int
    title: str
    type: str
    status: T.Status
    start_date: date
    due_date: date
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    pending_tasks: int


# Declared before /{assigned_goal_id}, which would otherwise try to read "all"
# as a goal id.
@router.get("/all", response_model=List[GoalSummary])
async def get_all_goals(
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    """Every goal of the user with its task progress, for the All goals screen."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Same as the schedule: settle overdue tasks so the counts are current.
        await fail_overdue_tasks(conn, user_id, client_today)
        rows = await conn.fetch(
            """
            SELECT
                ag.id,
                g.title,
                g.type,
                ag.status,
                ag.start_date,
                ag.due_date,
                COUNT(at.id) AS total_tasks,
                COUNT(at.id) FILTER (WHERE at.status = 'success') AS completed_tasks,
                COUNT(at.id) FILTER (WHERE at.status = 'failed') AS failed_tasks,
                COUNT(at.id) FILTER (WHERE at.status = 'pending') AS pending_tasks
            FROM public.assigned_goal ag
            JOIN public.goal g ON g.id = ag.goal_id
            LEFT JOIN public.assigned_task at ON at.assigned_goal_id = ag.id
            WHERE ag.user_id = $1
            GROUP BY ag.id, g.title, g.type
            ORDER BY ag.start_date DESC, ag.id DESC
            """,
            user_id,
        )
        return [GoalSummary(**dict(row)) for row in rows]


class PendingDay(BaseModel):
    date: date
    pending_tasks: int


# Declared before /{assigned_goal_id} for the same reason as /all.
@router.get("/pending_counts", response_model=List[PendingDay])
async def get_pending_counts(
    days: int = Query(default=7, ge=1, le=31),
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    """Unmarked tasks per day from today on, for the mobile reminder.

    Only days with pending tasks are returned. Future days can't be marked
    early, so their counts only change when goals are created or edited.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT ati.interval_date AS date, COUNT(*) AS pending_tasks
            FROM public.assigned_goal ag
            JOIN public.assigned_task at
                ON at.assigned_goal_id = ag.id
                AND at.status = 'pending'::status
            JOIN public.assigned_task_interval ati
                ON ati.assigned_task_id = at.id
            WHERE ag.user_id = $1
            AND ag.status IN ('pending','success')
            AND ati.interval_date BETWEEN $2 AND $3
            AND ati.interval_date BETWEEN ag.start_date AND ag.due_date
            GROUP BY ati.interval_date
            ORDER BY ati.interval_date
            """,
            user_id,
            client_today,
            client_today + timedelta(days=days - 1),
        )
        return [PendingDay(**dict(row)) for row in rows]


@router.get("/{assigned_goal_id}")
async def get_goal(
    assigned_goal_id: int,
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:

            goal_data = await conn.fetchrow(
                """
                SELECT g.id, g.title, g.type, ag.start_date, ag.due_date
                FROM goal g
                JOIN assigned_goal ag ON g.id = ag.goal_id
                WHERE ag.id = $1 AND ag.user_id = $2
                """,
                assigned_goal_id,
                user_id,
            )

            if not goal_data:
                raise HTTPException(status_code=404, detail="Goal not found")

            # One row per task (the old SELECT DISTINCT ... at.status listed a
            # task once per status, so a half-done task appeared twice and was
            # scheduled twice on save). Status is pending while any day is.
            tasks_data = await conn.fetch(
                """
                SELECT
                    t.id,
                    t.title,
                    t.description,
                    t.type AS repeat_type,
                    t.interval AS week_interval,
                    CASE
                        WHEN bool_or(at.status = 'pending') THEN 'pending'
                        WHEN bool_or(at.status = 'success') THEN 'success'
                        ELSE 'failed'
                    END AS status,
                    COALESCE(bool_or(ati.interval_date >= $2), false) AS has_upcoming,
                    array_agg(ati.interval_date ORDER BY ati.interval_date)
                        FILTER (WHERE ati.interval_date IS NOT NULL) AS dates
                FROM task t
                JOIN assigned_task at ON t.id = at.task_id
                LEFT JOIN assigned_task_interval ati ON ati.assigned_task_id = at.id
                WHERE at.assigned_goal_id = $1
                GROUP BY t.id, t.title, t.description, t.type, t.interval
                ORDER BY t.id
                """,
                assigned_goal_id,
                client_today,
            )

            # The editor shows tasks that still have days from today on; tasks
            # with only past days are history. A finished goal shows them all.
            if any(task["has_upcoming"] for task in tasks_data):
                tasks_data = [task for task in tasks_data if task["has_upcoming"]]

            tasks = []
            for task in tasks_data:
                # Specific dates for date and monthly tasks (monthly ones used to
                # come back empty, so saving them failed).
                date_interval = (
                    [d.isoformat() for d in (task["dates"] or [])]
                    if task["repeat_type"] in ("date", "monthly")
                    else []
                )
                tasks.append(
                    {
                        "id": task["id"],
                        "title": task["title"],
                        "description": task["description"],
                        "repeat_type": task["repeat_type"],
                        "date_interval": date_interval,
                        "week_interval": task["week_interval"],
                        "status": task["status"],
                    }
                )

            response = {
                "goal": {
                    "id": goal_data["id"],
                    "title": goal_data["title"],
                    "type": goal_data["type"],
                    "start_date": goal_data["start_date"].isoformat(),
                    "due_date": goal_data["due_date"].isoformat(),
                    "tasks": tasks,
                }
            }

            return JSONResponse(content=response)

        except HTTPException as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return JSONResponse(
                content={"error": f"Unexpected error: {str(e)}"}, status_code=500
            )


@router.get("/")
async def get_goals_today(
    today: Optional[date] = Query(default=None, description="Current date (YYYY-MM-DD)"),
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    # `today` is the date being viewed (it can be any day the user browses to);
    # `client_today` is the device's real date and decides what is overdue.
    # Resolve per request; a default evaluated at import goes stale after midnight.
    today = today or date.today()
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await fail_overdue_tasks(conn, user_id, client_today)
        rows = await conn.fetch(
            """
            SELECT
                ag.id AS assigned_goal_id,
                ag.status AS goal_status,
                ag.start_date,
                ag.due_date,
                g.title AS goal_title,
                g.type AS goal_type,
                at.id AS assigned_task_id,
                at.status AS task_status,
                t.title AS task_title,
                t.description AS task_description
            FROM public.assigned_goal ag
            JOIN public.goal g ON ag.goal_id = g.id
            JOIN public.assigned_task at
                ON at.assigned_goal_id = ag.id
                AND at.status = 'pending'::status
            JOIN public.assigned_task_interval ati
                ON ati.assigned_task_id = at.id
                AND ati.interval_date = $2
            JOIN public.task t ON t.id = at.task_id
            WHERE ag.user_id = $1
            AND ag.status IN ('pending','success')
            AND ag.start_date <= $2
            AND ag.due_date >= $2
            ORDER BY ag.id, at.id
            """,
            user_id,
            today,
        )

        goals_by_id = {}
        for row in rows:
            goal = goals_by_id.setdefault(
                row["assigned_goal_id"],
                {
                    "id": row["assigned_goal_id"],
                    "title": row["goal_title"],
                    "type": row["goal_type"],
                    "status": T.Status(row["goal_status"]),
                    "start_date": row["start_date"],
                    "due_date": row["due_date"],
                    "tasks": [],
                },
            )
            goal["tasks"].append(
                FetchTask(
                    id=row["assigned_task_id"],
                    title=row["task_title"],
                    description=row["task_description"],
                    status=T.Status(row["task_status"]),
                )
            )

        return [FetchGoal(**goal) for goal in goals_by_id.values()]  # Return the list of goals (filtered to include only those with tasks)


@router.put("/update_task_status")
async def update_task_status(
    request: TaskUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    client_today: date = Depends(get_client_today),
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        task_ids = list(set(request.assigned_task_id))

        # Every requested task must be pending and belong to this user
        assigned_tasks = await conn.fetch(
            """
            SELECT at.id, at.assigned_goal_id, MAX(ati.interval_date) AS interval_date
            FROM public.assigned_task at
            JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
            LEFT JOIN public.assigned_task_interval ati ON ati.assigned_task_id = at.id
            WHERE at.id = ANY($1)
            AND ag.user_id = $2
            AND at.status = 'pending'
            GROUP BY at.id, at.assigned_goal_id
            """,
            task_ids,
            user_id,
        )
        if not task_ids or len(assigned_tasks) != len(task_ids):
            raise HTTPException(status_code=404, detail="Task not found for this user")

        # Tasks can only be marked on (or after) their day: marking future days
        # early would let a long goal be "completed" today. client_today is the
        # user's local date (X-Local-Date, clamped to UTC +/- 1 day).
        future_dates = sorted(
            row.get("interval_date")
            for row in assigned_tasks
            if row.get("interval_date") and row.get("interval_date") > client_today
        )
        if future_dates:
            day = future_dates[0]
            raise HTTPException(
                status_code=400,
                detail=(
                    f"This task is scheduled for {day:%b} {day.day}. "
                    "You can mark it on that day."
                ),
            )

        async with conn.transaction():
            res = await conn.execute(
                """
                UPDATE public.assigned_task
                SET status = $1::status
                WHERE id = ANY($2)
                """,
                request.to,
                task_ids,
            )

            if res != f"UPDATE {len(task_ids)}":
                raise HTTPException(
                    status_code=500,
                    detail=f"Error updating task status to {request.to}",
                )

            for assigned_goal_id in {row["assigned_goal_id"] for row in assigned_tasks}:
                await check_goal_status(conn, assigned_goal_id)

        return {
            "message": f"Task status updated to {request.to}",
            "assigned_task_id": request.assigned_task_id,
        }


@router.delete("/delete/{assigned_goal_id}")
async def delete_goal(
    assigned_goal_id: int, user_id: str = Depends(get_current_user_id)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        res = await conn.execute(
            """
            DELETE FROM public.assigned_goal
            WHERE id = $1 AND user_id = $2
            """,
            assigned_goal_id,
            user_id,
        )
        if res != "DELETE 1":
            raise HTTPException(status_code=404, detail="Goal not found for this user")
        return JSONResponse(
            content={
                "status": "success",
                "message": "Goal deleted successfully",
            }
        )


async def fail_overdue_tasks(conn, user_id: str, client_today: date):
    """
    Mark the user's pending tasks scheduled before their local today as
    'failed', then settle the affected goals. Runs whenever the user's goals
    or analysis load, so statuses are current without a background job.
    """
    async with conn.transaction():
        rows = await conn.fetch(
            """
            UPDATE public.assigned_task at
            SET status = 'failed'
            FROM public.assigned_goal ag, public.assigned_task_interval ati
            WHERE at.assigned_goal_id = ag.id
            AND ati.assigned_task_id = at.id
            AND ag.user_id = $1
            AND at.status = 'pending'
            AND ati.interval_date < $2
            RETURNING at.assigned_goal_id
            """,
            user_id,
            client_today,
        )
        for assigned_goal_id in {row["assigned_goal_id"] for row in rows}:
            await check_goal_status(conn, assigned_goal_id)


async def check_goal_status(conn, assigned_goal_id: int):
    """
    Settle the goal once none of its tasks are pending: 'success' if at least
    half of its tasks succeeded, otherwise 'failed'. While any task is still
    pending the goal is left unchanged.
    """
    task_stats = await conn.fetchrow(
        """
        SELECT
            COUNT(*) AS total_tasks,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS completed_tasks,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_tasks
        FROM public.assigned_task
        WHERE assigned_goal_id = $1
        """,
        assigned_goal_id,
    )

    total_tasks = task_stats["total_tasks"] or 0
    completed_tasks = task_stats["completed_tasks"] or 0
    pending_tasks = task_stats["pending_tasks"] or 0

    if total_tasks == 0 or pending_tasks > 0:
        return

    status = "success" if completed_tasks * 2 >= total_tasks else "failed"
    await conn.execute(
        """
        UPDATE public.assigned_goal
        SET status = $2::status
        WHERE id = $1
        """,
        assigned_goal_id,
        status,
    )
