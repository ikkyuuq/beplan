from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/goals/{user_id}")
def read_goals(user_id: int):
    goals = [
        {"id": 1, "name": "Lose 10 pounds"},
        {"id": 2, "name": "Save $1000"},
    ] 
    return JSONResponse(content=goals)
