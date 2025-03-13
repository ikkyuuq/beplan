import json
import os
from datetime import datetime
from enum import Enum
from typing import Dict, List

from anthropic import Anthropic
from const import types as T
from database import get_db_pool
from fastapi import APIRouter, HTTPException
from flair.data import Sentence
from flair.models import SequenceTagger
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from utils import goal_creation

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = "claude-3-haiku-20240307"
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
client = Anthropic(api_key=ANTHROPIC_API_KEY)

try:
    model_path = hf_hub_download(
        repo_id="ikkyuu/smart-ner",
        filename="best-model.pt",
    )
    tagger = SequenceTagger.load(model_path)
except Exception as e:
    raise ValueError(f"Failed to load Flair NER model: {str(e)}")

router = APIRouter()


class LabelType(Enum):
    SPECIFIC = "specific"
    MEASURABLE = "measurable"
    ACHIEVABLE = "achievable"
    RELEVANT = "relevant"
    TIME_BOUND = "time_bound"


class AIInput(BaseModel):
    text: str


class PredictionResult(BaseModel):
    original_text: str
    prediction: Dict[str, List[Dict]]


class SubmitRequest(BaseModel):
    prediction_result: PredictionResult
    question: str
    to_label: str
    value: str


def parse_ai_response(response) -> dict:
    try:
        raw_content = (
            response.content[0].text
            if isinstance(response.content, list)
            else str(response)
        )
        json_start = raw_content.find("{")
        json_end = raw_content.rfind("}") + 1
        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON found in AI response")

        json_str = raw_content[json_start:json_end]
        return json.loads(json_str)
    except (json.JSONDecodeError, ValueError, AttributeError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI response parsing failed: {str(e)}. Content: {raw_content}",
        )


@router.post("/validate", tags=["ai"])
async def validate_sentence(input_data: AIInput):
    try:
        sentence = Sentence(input_data.text)
        tagger.predict(sentence)

        smart_criteria = {label.value: [] for label in LabelType}
        for entity in sentence.get_spans("ner"):
            label = entity.labels[0].value.lower().replace("-", "_")
            if label in smart_criteria:
                smart_criteria[label].append(
                    {"text": entity.text, "from": "original_text"}
                )

        return PredictionResult(
            original_text=input_data.text, prediction=smart_criteria
        )
    except Exception as e:
        raise HTTPException(500, f"Validation error: {str(e)}")


@router.post("/generate-questions", tags=["ai"])
async def generate_questions(request: PredictionResult):
    try:
        missing = [
            label.value
            for label in LabelType
            if not request.prediction.get(label.value, [])
        ]
        if not missing:
            return {"result": []}

        prompt = f"""Generate follow-up questions for missing SMART criteria in this goal:
        Original Text: {request.original_text}
        Missing Criteria: {", ".join(missing)}
        Current Predictions: {json.dumps(request.prediction, indent=2)}
        
        RULES:
        - Generate 1 question per missing criteria
        - Questions must reference the original text
        - Use 'date' type only for time_bound questions
        - Return JSON format with 'label', 'question' and 'type'
        """

        ai_response = call_anthropic_api(
            model=ANTHROPIC_MODEL,
            system="You are a SMART goal assistant. Generate specific, context-aware questions.",
            prompt=prompt,
        )

        valid_questions = [
            q
            for q in ai_response.get("result", [])
            if (
                q.get("label") in missing
                and q.get("question")
                and q.get("type") in ["date", "yes-no", "open-ended"]
            )
        ]
        return {"result": valid_questions}
    except Exception as e:
        raise HTTPException(500, f"Question generation failed: {str(e)}")


@router.post("/submit-question", tags=["ai"])
async def submit_question(request: SubmitRequest):
    try:
        if request.to_label not in [label.value for label in LabelType]:
            raise HTTPException(400, "Invalid label type")

        if not request.value.strip():
            raise HTTPException(400, "Value cannot be empty")

        updated_prediction = request.prediction_result.prediction.copy()
        updated_prediction[request.to_label] = [
            {"text": request.value, "from": "question", "question": request.question}
        ]

        return {
            "message": "Prediction updated",
            "result": PredictionResult(
                original_text=request.prediction_result.original_text,
                prediction=updated_prediction,
            ),
        }
    except Exception as e:
        raise HTTPException(500, f"Submission failed: {str(e)}")


@router.post("/generate-goal", tags=["ai"])
async def generate_goal(request: PredictionResult):
    try:
        time_bound = request.prediction.get("time_bound")
        if not time_bound:
            raise HTTPException(400, "Missing time_bound for goal generation")

        today = datetime.today().date()
        try:
            due_date = datetime.strptime(time_bound[0]["text"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Invalid date format, use YYYY-MM-DD")

        if due_date < today:
            raise HTTPException(400, "Due date cannot be in the past")

        prompt = f"""Generate SMART goal tasks with these parameters:
        Original Text: {request.original_text}
        Start Date: {today.isoformat()}
        Due Date: {due_date.isoformat()}
        Predictions: {json.dumps(request.prediction, indent=2)}
        
        Include 7-14 tasks with proper scheduling between dates.
        Validate all dates are within the specified range.
        """

        ai_response = call_anthropic_api(
            model=ANTHROPIC_MODEL,
            system="You are a SMART goal task generator. Create actionable tasks with clear timelines.",
            prompt=prompt,
        )

        if not all(
            key in ai_response for key in ["title", "tasks", "start_date", "due_date"]
        ):
            raise ValueError("Invalid goal structure from AI")

        return ai_response
    except Exception as e:
        raise HTTPException(500, f"Goal generation failed: {str(e)}")


@router.post("/create", tags=["goal"])
async def create_goal(req: T.GoalCreateRequest):
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await goal_creation.Create(conn, req, req.user_id)
                return {"status": "success", "message": "Goal created"}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Database error: {str(e)}")
