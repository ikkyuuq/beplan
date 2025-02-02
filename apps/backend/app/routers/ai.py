from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class AIInput(BaseModel):
    text: str

@router.post("/predict", tags=['ai'])
async def predict_sentence(input_data: AIInput):
    text = input_data.text
    return {"prediction": "Processed: " + text}
