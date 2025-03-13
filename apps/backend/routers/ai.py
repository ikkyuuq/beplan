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
ANTHROPIC_MODEL = "claude-3-7-sonnet-20250219"
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
            else str(response.content)
        )
        return json.loads(raw_content)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response: {str(e)}"
        )


def call_anthropic_api(model: str, system: str, prompt: str) -> dict:
    response = client.messages.create(
        model=model,
        max_tokens=1000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return parse_ai_response(response)


def normalize_label(label: str) -> str:
    return label.replace("-", "_")


@router.post("/validate", tags=["ai"])
async def validate_sentence(input_data: AIInput):
    try:
        sentence = Sentence(input_data.text)
        tagger.predict(sentence)

        # Prepare empty lists for each SMART criterion.
        smart_criteria = {
            "specific": [],
            "measurable": [],
            "achievable": [],
            "relevant": [],
            "time_bound": [],
        }

        # Process NER spans and update the matching list.
        for entity in sentence.get_spans("ner"):
            label = normalize_label(entity.labels[0].value)
            if label in smart_criteria:
                smart_criteria[label].append(
                    {"text": entity.text, "from": "original_text"}
                )

        prediction_result = {
            "original_text": input_data.text,
            "prediction": smart_criteria,
        }
        return prediction_result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during prediction: {str(e)}"
        )


@router.post("/generate-questions", tags=["ai"])
async def generate_questions(request: PredictionResult):
    try:
        # Check for any missing criteria.
        criteria_to_check = [
            "specific",
            "measurable",
            "achievable",
            "relevant",
            "time_bound",
        ]
        has_empty_criteria = any(
            not request.prediction.get(key) for key in criteria_to_check
        )

        if not has_empty_criteria:
            return {"message": "No questions needed - all criteria are filled"}

        prompt = f"""
            Generate Questions for Missing SMART Criteria

            INPUT:
            {json.dumps(request.dict(), indent=2)}

            TASK:
            1. Examine the prediction object's arrays.
            2. For each empty array, generate an appropriate follow-up question:
               - Questions should help complete missing SMART criteria.
               - Questions must directly relate to the original_text.
               - Questions must be brief, precise, unambiguous, and impactful on the original_text.

            QUESTION TYPES:
            - time_bound: Use "date" type for deadline/timeline questions.
            - achievable: Use "yes-no" for feasibility checks.
            - All others: Use "open-ended" for detailed responses.

            OUTPUT FORMAT:
            {{
                "[criteria_name]": {{
                  "question": "Your follow-up question here",
                  "type": "date|yes-no|open-ended"
                }}
            }}

            RULES:
            - Only generate questions for empty arrays.
            - Each question must help validate one specific SMART criterion.
            - Questions should be contextual to the original goal.
            - Avoid generic questions - reference specific details from original_text.
            - Use "date" type only for time_bound questions.

            Example Input:
            {{
              "original_text": "to prevent health issues I need to lose 10 pounds",
              "prediction": {{
                "specific": ["..."],
                "measurable": ["..."],
                "achievable": [],
                "relevant": ["..."],
                "time_bound": []
              }}
            }}

            Example Output:
            {{
                "achievable": {{
                  "question": "Is losing 10 pounds in one week a safe and realistic goal for you?",
                  "type": "yes-no"
                }},
                "time_bound": {{
                  "question": "What is your exact target date for losing the 10 pounds?",
                  "type": "date"
                }}
            }}

            Note: Return only valid JSON without comments or explanations.
        """

        ai_response = call_anthropic_api(
            model=ANTHROPIC_MODEL,
            system="You are a SMART goal refinement assistant. Generate contextual questions to fill gaps in SMART criteria, ensuring each question includes a `type` (open-ended, yes-no, date).",
            prompt=prompt,
        )
        return ai_response

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating questions: {str(e)}"
        )


@router.post("/submit-question", tags=["ai"])
async def submit_question(request: SubmitRequest):
    try:
        to_label = request.to_label
        prediction_result = request.prediction_result
        value = request.value
        question = request.question

        # Validate the label using the LabelType enum.
        if to_label not in {label.value for label in LabelType}:
            raise HTTPException(
                status_code=400, detail=f"Invalid prediction type: {to_label}"
            )

        if value is None:
            raise HTTPException(status_code=400, detail="Value cannot be None")

        # Update the prediction for the given criterion.
        prediction_result.prediction[to_label] = [
            {
                "text": value,
                "from": "question",
                "question": question,
            }
        ]

        return {
            "message": "Successfully updated prediction",
            "result": prediction_result,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error updating prediction: {str(e)}"
        )


@router.post("/generate-goal", tags=["ai"])
async def generate_goal(request: PredictionResult):
    try:
        today = datetime.today().date().strftime("%Y-%m-%d")
        start_date = today
        due_date = request.prediction["time_bound"][0]["text"]

        goal_input = {
            "original_text": request.original_text,
            "prediction": request.prediction,
            "start_date": start_date,
            "due_date": due_date,
        }

        prompt = f"""
            Generate Task for SMART Goal

            INPUT:
            {json.dumps(goal_input, indent=2)}

            TASK:
            Generate a series of actionable tasks that will help achieve the SMART goal. Each task should:
            1. Be specific and measurable.
            2. Have a clear deadline or recurring schedule.
            3. Contribute directly to achieving the main goal.
            4. Be realistic and achievable.

            OUTPUT FORMAT:
            {{
              "title": "Goal tilte from the original_text",
              "type": "smart goal (fixed value)",
              "start_date": "YYYY-MM-DD from start_date input",
              "due_date": "YYYY-MM-DD from due_date input",
              "tasks": [
                {{
                  "title": "Clear, action-oriented task title",
                  "description": "Brief description of what needs to be done",
                  "repeat_type": "date|daily|weekly|monthly",
                  "week_interval": "[0, 1, 2, 3, 4, 5, 6]",
                  "date_interval": ["YYYY-MM-DD", "YYYY-MM-DD"]
                }}
              ]
            }}

            RULES:
            1. Task Creation:
               - Create 7-14 distinct tasks that break down the goal.
               - Each task must be actionable and measurable.
               - Tasks should form a logical progression towards the goal.

            2. Timing Rules:
               - All task dates must be between {start_date} and {due_date}.
               - Space tasks appropriately across the available time.
               - For recurring tasks, set appropriate frequencies.

            3. Repeat Types:
               - "date": Task to be completed on specific days (insert into dates).
               - "daily": Daily task with no specific days.
               - "weekly": Select specific days of the week to repeat (insert weekday numbers into interval).
               - "monthly": Set specific days of the month to repeat (insert into dates).

            Example Input:
            {{
              "original_text": "I want to lose 10 pounds in 2 months",
              "prediction": {{
                "specific": ["lose"],
                "measurable": ["10 pounds"],
                "achievable": ["yes"],
                "relevant": ["for better health"],
                "time_bound": ["2 months"]
              }},
              "start_date": "2024-03-15",
              "due_date": "2024-05-15"
            }}

            Example Output:
            {{
              "title": "Lose 10 pounds in 2 months",
              "type": "smart goal",
              "start_date": "2024-03-15",
              "due_date": "2024-05-15",
              "tasks": [
                {{
                  "title": "Track daily calorie intake",
                  "description": "Log all meals and snacks in fitness app, staying under 2000 calories",
                  "repeat_type": "daily",
                  "week_interval": null,
                  "date_interval": null
                }},
                {{
                  "title": "30-minute cardio workout",
                  "description": "Complete either jogging, cycling, or swimming",
                  "repeat_type": "weekly",
                  "week_interval": [0, 2, 4],
                  "date_interval": null
                }},
                {{
                  "title": "Monthly weight check and progress photo",
                  "description": "Record weight and take progress photos for tracking",
                  "repeat_type": "monthly",
                  "week_interval": null,
                  "date_interval": ["2024-04-15", "2024-05-15", "2024-06-15"]
                }}
              ]
            }}

            Note: Return only valid JSON without comments or explanations.
        """

        ai_response = call_anthropic_api(
            model=ANTHROPIC_MODEL,
            system="You are a SMART goal task generation assistant. Break down SMART goals into actionable tasks with clear timelines and measurable outcomes.",
            prompt=prompt,
        )
        return ai_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating task: {str(e)}")


@router.post("/create", tags=["goal"])
async def create_goal(req: T.GoalCreateRequest):
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await goal_creation.Create(conn, req, req.user_id)
        return {"status": "success", "message": "Goal with tasks created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
