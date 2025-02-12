from fastapi import FastAPI,HTTPException
from datetime import datetime
from pydantic import BaseModel
from typing import Optional,List

app = FastAPI()

class Task(BaseModel):
    id:int
    title:str
    subtask:Optional[str] = None
    start_date:datetime
    finish_date:datetime

task_db =[]

@app.get("/tasks/",response_model=List[Task])
async def get_task():
    return task_db

@app.get("/tasks/{task_id}",response_model= Task)
async def get_task(task_id:int):
    for task in task_db:
        if task.id == task_id:
            return task
    raise HTTPException(status_code=404,detail="task not found")

@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int):
    for index, task in enumerate(task_db):
        if task.id == task_id:
            task_db.pop(index)
            return {"message": "Task deleted"}
    raise HTTPException(status_code=404, detail="Task not found")