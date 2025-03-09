from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_db_pool

router = APIRouter()


class RescheduleTaskRequest(BaseModel):
    assigned_task_id: int
    user_id: str
    new_date: date


@router.put("/task")
async def reschedule_task(request: RescheduleTaskRequest):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if the task exists and belongs to the user
        assigned_task = await conn.fetchrow(
            """
            SELECT at.* 
            FROM public.assigned_task at
            JOIN public.assigned_goal ag ON at.assigned_goal_id = ag.id
            WHERE at.id = $1
            AND ag.user_id = $2
            """,
            request.assigned_task_id,
            request.user_id,
        )

        if not assigned_task:
            raise HTTPException(status_code=404, detail="Task not found for this user")

        # Update task's interval date
        res = await conn.execute(
            """
            UPDATE public.assigned_task_interval
            SET interval_date = $1
            WHERE assigned_task_id = $2
            """,
            request.new_date,
            request.assigned_task_id,
        )

        if res != "UPDATE 1":
            raise HTTPException(status_code=500, detail="Error rescheduling task")

        return {
            "message": f"Task rescheduled to {request.new_date}",
            "assigned_task_id": request.assigned_task_id,
        }
