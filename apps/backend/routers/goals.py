import logging
from datetime import date
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


@router.put("/update")
async def update_goal(
    req: GoalUpdateRequest, user_id: str = Depends(get_current_user_id)
):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                # update assigned_goal first; it also confirms the user owns this goal
                res = await conn.execute(
                    """
                    UPDATE assigned_goal
                    SET start_date = $1, due_date = $2, updated_at = NOW()
                    WHERE goal_id = $3
                    AND user_id = $4
                    AND id = $5
                    """,
                    req.goal.start_date,
                    req.goal.due_date,
                    req.goal.id,
                    user_id,
                    req.assigned_goal_id,
                )
                if res != "UPDATE 1":
                    raise HTTPException(status_code=404, detail="Goal not found for this user")

                # update goal
                await conn.execute(
                    """
                    UPDATE goal
                    SET title = $1, type = $2, updated_at = NOW()
                    WHERE id = $3
                    """,
                    req.goal.title,
                    req.goal.type,
                    req.goal.id,
                )

                # Delete old assigned_task_interval before the assigned_task rows it references
                await conn.execute(
                    """
                    DELETE FROM assigned_task_interval
                    WHERE assigned_task_id IN (
                        SELECT id FROM assigned_task WHERE assigned_goal_id = $1
                    )
                    """,
                    req.assigned_goal_id,
                )

                await conn.execute(
                    """
                    DELETE FROM assigned_task
                    WHERE assigned_goal_id = $1
                    """,
                    req.assigned_goal_id,
                )

                # delete tasks with status as deleted
                for task in req.goal.tasks:
                    if task.status == T.Status.DELETED:
                        await conn.execute(
                            """
                            DELETE FROM task
                            WHERE id = $1 AND goal_id = $2
                            """,
                            task.id,
                            req.goal.id,
                        )

                # Update or add new tasks
                for task in req.goal.tasks:
                    if task.status != T.Status.DELETED:
                        if task.id:  # If the id is an existing task
                            await conn.execute(
                                """
                                UPDATE task
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
                        else:  # If there is no id, it is a new task.
                            task_id = await conn.fetchrow(
                                """
                                INSERT INTO task (title, description, goal_id, interval, type)
                                VALUES ($1, $2, $3, $4, $5)
                                RETURNING id
                                """,
                                task.title,
                                task.description,
                                req.goal.id,
                                task.week_interval if task.week_interval else None,
                                task.repeat_type,
                            )
                            task.id = task_id["id"]  # Set the new task id

                # Create new assigned_task and assigned_task_interval
                for task in req.goal.tasks:
                    if task.status != T.Status.DELETED:
                        # Check the task exists and belongs to this goal.
                        task_exists = await conn.fetchrow(
                            """
                            SELECT id FROM task WHERE id = $1 AND goal_id = $2
                            """,
                            task.id,
                            req.goal.id,
                        )

                        if not task_exists:
                            raise HTTPException(
                                status_code=404, detail=f"Task with id {task.id} not found"
                            )

                        interval_dates = await goal_creation.get_interval_dates(
                            task, req.goal.start_date, req.goal.due_date
                        )

                        # Create a new assigned_task and assigned_task_interval for each date.
                        for interval_date in interval_dates:
                            assigned_task_id = await conn.fetchrow(
                                """
                                INSERT INTO assigned_task (assigned_goal_id, task_id)
                                VALUES ($1, $2)
                                RETURNING id
                                """,
                                req.assigned_goal_id,
                                task.id,
                            )

                            await conn.execute(
                                """
                                INSERT INTO assigned_task_interval (assigned_task_id, interval_date)
                                VALUES ($1, $2)
                                """,
                                assigned_task_id["id"],
                                interval_date,
                            )

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


@router.get("/{assigned_goal_id}")
async def get_goal(assigned_goal_id: int, user_id: str = Depends(get_current_user_id)):
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

            tasks_data = await conn.fetch(
                """
                SELECT DISTINCT t.id, t.title, t.description, t.type as repeat_type, t.interval as week_interval, at.status
                FROM task t
                JOIN assigned_task at ON t.id = at.task_id
                WHERE at.assigned_goal_id = $1
                """,
                assigned_goal_id,
            )

            tasks = []
            for task in tasks_data:
                # Get date_interval for jobs with Repeat_type of 'date'
                date_interval = []
                if task["repeat_type"] == "date":
                    date_interval = await conn.fetch(
                        """
                        SELECT interval_date
                        FROM assigned_task_interval
                        WHERE assigned_task_id IN (
                            SELECT id FROM assigned_task WHERE task_id = $1 AND assigned_goal_id = $2
                        )
                        """,
                        task["id"],
                        assigned_goal_id,
                    )
                    date_interval = [
                        row["interval_date"].isoformat() for row in date_interval
                    ]

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
