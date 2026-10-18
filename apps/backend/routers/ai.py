import json
import os
import re
from datetime import date
from enum import Enum
from typing import Dict, List, Optional

import anthropic
from anthropic import Anthropic
from auth import get_current_user_id
from const import types as T
from database import get_db_pool
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from flair.data import Sentence
from flair.models import SequenceTagger
from huggingface_hub import hf_hub_download
from pydantic import BaseModel, ValidationError
from starlette.concurrency import run_in_threadpool
from utils import goal_creation
from utils.client_date import get_client_today

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL") or "claude-sonnet-5-5"
client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


tagger = None
try:
    model_path = hf_hub_download(
        repo_id="ikkyuu/smart-ner",
        filename="best-model.pt",
    )
    tagger = SequenceTagger.load(model_path)
except Exception as e:
    print(f"Warning: Failed to load Flair NER model: {str(e)}. AI features will be disabled.")


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
    # The model thinks by default, so the reply can start with thinking blocks;
    # the answer is in the text blocks.
    raw_content = "".join(
        block.text
        for block in getattr(response, "content", None) or []
        if getattr(block, "type", None) == "text" and isinstance(getattr(block, "text", None), str)
    ).strip()
    try:
        # Clean up the response if needed
        if raw_content.startswith("```json"):
            raw_content = raw_content[7:-3]  # Remove json code block markers
        elif raw_content.startswith("```"):
            raw_content = raw_content[3:-3]  # Remove generic code block markers

        return json.loads(raw_content.strip())
    except json.JSONDecodeError as e:
        print(f"Failed to parse AI response: {e}. Raw content: {raw_content[:500]!r}")
        raise HTTPException(
            status_code=502,
            detail="The AI returned an unreadable answer. Please try again.",
        )


def call_anthropic_api(model: str, system: str, prompt: str, max_tokens: int = 8000) -> dict:
    if not client:
        raise HTTPException(status_code=503, detail="AI features are disabled due to missing ANTHROPIC_API_KEY")
    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.APIError as error:
        raise anthropic_http_error(error) from error
    # A reply cut off at the token limit is half a JSON object.
    stop_reason = getattr(response, "stop_reason", None)
    if stop_reason == "max_tokens":
        print(f"Anthropic reply hit max_tokens={max_tokens}")
        raise HTTPException(status_code=502, detail="The AI's answer was too long. Please try again.")
    if stop_reason == "refusal":
        print("Anthropic declined the request (stop_reason=refusal)")
        raise HTTPException(status_code=422, detail="The AI couldn't help with this goal. Try rewording it.")
    return parse_ai_response(response)


# Upstream failures are ours, not the client's: 502 when the AI service rejects
# our setup (key, credit, model), 503 when it's busy or unreachable.
def anthropic_http_error(error: anthropic.APIError) -> HTTPException:
    request_id = getattr(error, "request_id", None)
    print(f"Anthropic API error ({type(error).__name__}, request_id={request_id}): {error}")
    if isinstance(error, (anthropic.AuthenticationError, anthropic.PermissionDeniedError)):
        return HTTPException(status_code=502, detail="AI service unavailable: the server's API key was rejected.")
    if isinstance(error, anthropic.NotFoundError):
        return HTTPException(status_code=502, detail=f"AI service unavailable: model '{ANTHROPIC_MODEL}' was not found.")
    if isinstance(error, anthropic.BadRequestError) and "credit balance" in str(error).lower():
        return HTTPException(status_code=502, detail="AI service unavailable: the API account is out of credit.")
    if isinstance(error, anthropic.RateLimitError) or getattr(error, "status_code", None) == 529:
        return HTTPException(status_code=503, detail="AI service is busy. Please try again in a moment.")
    if isinstance(error, anthropic.APIConnectionError):
        return HTTPException(status_code=503, detail="Couldn't reach the AI service. Please try again.")
    return HTTPException(status_code=502, detail="AI service returned an error. Please try again.")


def normalize_label(label: str) -> str:
    return label.replace("-", "_")


# Asked when the AI skips a missing criterion, so every gap gets a question.
FALLBACK_QUESTIONS = {
    "specific": ("What exactly do you want to achieve?", "open-ended"),
    "measurable": ("How will you measure your progress?", "open-ended"),
    "achievable": ("Do you have the time and resources to do this?", "yes-no"),
    "relevant": ("Why does this goal matter to you?", "open-ended"),
    "time_bound": ("When do you want to reach this goal?", "date"),
}
QUESTION_TYPES = {"open-ended", "yes-no", "date"}


def complete_questions(ai_questions: list, missing_keys: List[str]) -> List[dict]:
    """One usable question per missing key, in SMART order."""
    by_label = {}
    for q in ai_questions:
        if not isinstance(q, dict):
            continue
        label = q.get("label")
        text = q.get("question")
        if label in missing_keys and label not in by_label and isinstance(text, str) and text.strip():
            by_label[label] = {"label": label, "question": text.strip(), "type": q.get("type")}
    questions = []
    for key in missing_keys:
        fallback_text, fallback_type = FALLBACK_QUESTIONS[key]
        q = by_label.get(key) or {"label": key, "question": fallback_text, "type": fallback_type}
        # The due date has to come back as a real date.
        if key == "time_bound":
            q["type"] = "date"
        elif q["type"] not in QUESTION_TYPES:
            q["type"] = fallback_type
        questions.append(q)
    return questions


_NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}
_RELATIVE_SPAN = re.compile(r"\b(\d+|" + "|".join(_NUMBER_WORDS) + r")\s*(day|week|month|year)s?\b", re.I)
MAX_GOAL_LENGTH = relativedelta(years=3)


def resolve_due_date(time_bound: str, start: date) -> Optional[date]:
    """The due date for an ISO date ("2026-12-01") or a span ("in 2 months");
    None when the text is something else ("by summer")."""
    text = (time_bound or "").strip()
    try:
        due = date.fromisoformat(text[:10])
    except ValueError:
        match = _RELATIVE_SPAN.search(text)
        if not match:
            return None
        amount, unit = match.groups()
        n = int(amount) if amount.isdigit() else _NUMBER_WORDS[amount.lower()]
        due = start + relativedelta(**{f"{unit.lower()}s": n}) - relativedelta(days=1)
    return due if start < due <= start + MAX_GOAL_LENGTH else None


def clean_generated_goal(ai_goal: dict, start: date, due: Optional[date]) -> dict:
    """Check the AI's plan before the app shows it: fixed dates, valid tasks only."""
    if not isinstance(ai_goal, dict):
        raise HTTPException(status_code=502, detail="The AI returned an unusable plan. Please try again.")
    if due is None:
        try:
            due = date.fromisoformat(str(ai_goal.get("due_date"))[:10])
        except ValueError:
            due = None
        if due is None or not (start < due <= start + MAX_GOAL_LENGTH):
            raise HTTPException(status_code=502, detail="The AI couldn't work out a due date. Please try again.")

    tasks = []
    for raw in ai_goal.get("tasks") or []:
        try:
            task = T.Task.model_validate(raw)
        except ValidationError:
            continue
        if task.repeat_type == T.RepeatType.WEEKLY:
            task.week_interval = sorted({d for d in task.week_interval or [] if 0 <= d <= 6})
            task.date_interval = None
            if not task.week_interval:
                continue
        elif task.repeat_type in (T.RepeatType.DATE, T.RepeatType.MONTHLY):
            task.date_interval = sorted({d for d in task.date_interval or [] if start <= d <= due})
            task.week_interval = None
            if not task.date_interval:
                continue
        else:
            task.week_interval = task.date_interval = None
        tasks.append(task)
    if not tasks:
        raise HTTPException(status_code=502, detail="The AI returned a plan without usable tasks. Please try again.")

    title = ai_goal.get("title")
    goal = T.Goal(
        title=title.strip() if isinstance(title, str) and title.strip() else "My SMART goal",
        type=T.GoalType.SMART_GOAL,
        start_date=start,
        due_date=due,
        tasks=tasks,
    )
    return goal.model_dump(mode="json")


@router.post("/validate", tags=["ai"])
async def validate_sentence(input_data: AIInput):
    try:
        if not tagger:
            return {
                "original_text": input_data.text,
                "prediction": {
                    "specific": [],
                    "measurable": [],
                    "achievable": [],
                    "relevant": [],
                    "time_bound": [],
                },
            }

        sentence = Sentence(input_data.text)
        await run_in_threadpool(tagger.predict, sentence)

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

    except Exception as error:
        print(f"AI validation failed: {error}")
        raise HTTPException(status_code=500, detail="Error during prediction")


@router.post("/generate-questions", tags=["ai"])
async def generate_questions(request: PredictionResult):
    try:
        # Define the SMART criteria to check
        criteria_to_check = [
            "specific",
            "measurable",
            "achievable",
            "relevant",
            "time_bound",
        ]

        # Identify missing criteria: empty list or missing key
        missing_keys = [
            key for key in criteria_to_check if not request.prediction.get(key)
        ]

        if not missing_keys:
            # No criteria missing; no questions needed.
            return {"result": []}

        prompt = f"""
            Generate Questions for Missing SMART Criteria

            INPUT:
            {json.dumps(request.model_dump(), indent=2)}

            TASK:
            1. Examine the prediction object's arrays.
            2. For each empty array (for the criteria: {", ".join(missing_keys)}), generate an appropriate follow-up question:
               - Questions should help complete the missing SMART criteria.
               - Questions must directly relate to the original_text.
               - Questions must be brief, precise, unambiguous, and impactful on the original_text.

            QUESTION TYPES:
            - time_bound: Use "date" type for deadline/timeline questions.
            - achievable: Use "yes-no" for feasibility checks.
            - All others: Use "open-ended" for detailed responses.

            OUTPUT FORMAT:
            {{
              "result": [
                {{
                  "label": "specific|measurable|achievable|relevant|time_bound",
                  "question": "Your follow-up question here",
                  "type": "date|yes-no|open-ended"
                }}
              ]
            }}

            RULES:
            - Only generate questions for empty arrays.
            - Each question must help validate one specific SMART criterion.
            - Questions should be contextual to the original goal.
            - Avoid generic questions - reference specific details from original_text.
            - Use "date" type only for time_bound questions.

            Note: Return only valid JSON without comments or explanations.
        """

        ai_response = await run_in_threadpool(
            call_anthropic_api,
            model=ANTHROPIC_MODEL,
            system="You are a SMART goal refinement assistant. Generate contextual questions to fill gaps in SMART criteria, ensuring each question includes a `type` (open-ended, yes-no, date).",
            prompt=prompt,
        )

        return {"result": complete_questions(ai_response.get("result") or [], missing_keys)}
    except HTTPException:
        raise
    except Exception as error:
        print(f"AI question generation failed: {error}")
        raise HTTPException(status_code=500, detail="Error generating questions")


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

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error updating prediction")


@router.post("/generate-goal", tags=["ai"])
async def generate_goal(
    request: PredictionResult, client_today: date = Depends(get_client_today)
):
    try:
        start = client_today
        time_bound = request.prediction.get("time_bound")
        if not time_bound or not time_bound[0].get("text"):
            raise HTTPException(status_code=400, detail="time_bound is required")
        due = resolve_due_date(str(time_bound[0]["text"]), start)
        start_date = start.isoformat()
        # Unparsed spans ("by summer") are left to the AI and checked afterwards.
        due_date = due.isoformat() if due else (
            f"YYYY-MM-DD you work out from the time_bound \"{time_bound[0]['text']}\", counting from {start_date}"
        )

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
               - "weekly": Select specific days of the week to repeat (insert weekday numbers into week_interval, 0 = Sunday ... 6 = Saturday).
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

        ai_response = await run_in_threadpool(
            call_anthropic_api,
            model=ANTHROPIC_MODEL,
            system="You are a SMART goal task generation assistant. Break down SMART goals into actionable tasks with clear timelines and measurable outcomes.",
            prompt=prompt,
            max_tokens=16000,
        )
        return clean_generated_goal(ai_response, start, due)

    except HTTPException:
        raise
    except Exception as error:
        print(f"AI goal generation failed: {error}")
        raise HTTPException(status_code=500, detail="Error generating task")


@router.post("/create", tags=["goal"])
async def create_goal(
    req: T.GoalCreateRequest, user_id: str = Depends(get_current_user_id)
):
    pool = await get_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await goal_creation.Create(conn, req, user_id)

                return {
                    "status": "success",
                    "message": "Goal with tasks created successfully",
                }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
