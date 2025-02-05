import json
import os
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from anthropic import Anthropic
from fastapi import APIRouter, HTTPException
from flair.data import Sentence
from flair.models import SequenceTagger
from huggingface_hub import hf_hub_download
from pydantic import BaseModel

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
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
    print(f"Error loading model: {str(e)}")
    raise

router = APIRouter()


class LabelType(Enum):
    S = "specific"
    M = "measurable"
    A = "achievable"
    R = "relevant"
    T = "time-bound"


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


@router.post("/validate", tags=["ai"])
async def validate_sentence(input_data: AIInput):
    try:
        sentence = Sentence(input_data.text)

        tagger.predict(sentence)

        specific = []
        measurable = []
        achievable = []
        relevant = []
        time_bound = []

        for entity in sentence.get_spans("ner"):
            if entity.labels[0].value == "specific":
                specific.append({"text": entity.text, "from": "original_text"})
            elif entity.labels[0].value == "measurable":
                measurable.append({"text": entity.text, "from": "original_text"})
            elif entity.labels[0].value == "achievable":
                achievable.append({"text": entity.text, "from": "original_text"})
            elif entity.labels[0].value == "relevant":
                relevant.append({"text": entity.text, "from": "original_text"})
            elif entity.labels[0].value == "time-bound":
                time_bound.append({"text": entity.text, "from": "original_text"})

        # Store the prediction results
        prediction_result = {
            "original_text": input_data.text,
            "prediction": {
                "specific": specific,
                "measurable": measurable,
                "achievable": achievable,
                "relevant": relevant,
                "time-bound": time_bound,
            },
        }

        return prediction_result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error during prediction: {str(e)}"
        )


@router.post("/generate-questions", tags=["ai"])
async def generate_questions(request: PredictionResult):
    try:
        prediction_result = request

        has_empty_criteria = any(
            not prediction_result.prediction[key]
            for key in [
                "specific",
                "measurable",
                "achievable",
                "relevant",
                "time_bound",
            ]
        )

        if not has_empty_criteria:
            return {"message": "No questions needed - all criteria are filled"}

        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            system="You are a SMART goal refinement assistant. Generate contextual questions to fill gaps in SMART criteria, ensuring each question includes a `type` (open-ended, yes-no, date).",
            messages=[
                {
                    "role": "user",
                    "content": f"""
                        Generate Questions for Missing SMART Criteria

                        INPUT:
                        {prediction_result}

                        TASK:
                        1. Examine the prediction object's arrays
                        2. For each empty array, generate an appropriate follow-up question:
                           - Questions should help complete missing SMART criteria
                           - Questions must directly relate to the original_text
                           - Questions must to be brief, precise, unambiguous, and impactful on the original_text

                        QUESTION TYPES:
                        - time_bound: Use "date" type for deadline/timeline questions
                        - achievable: Use "yes-no" for feasibility checks
                        - All others: Use "open-ended" for detailed responses

                        OUTPUT FORMAT:
                        {{
                            "[criteria_name]": {{
                              "question": "Your follow-up question here",
                              "type": "date|yes-no|open-ended"
                            }}
                        }}

                        RULES:
                        - Only generate questions for empty arrays
                        - Each question must help validate one specific SMART criterion
                        - Questions should be contextual to the original goal
                        - Avoid generic questions - reference specific details from original_text
                        - Use "date" type only for time_bound questions

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
                        """,
                },
            ],
        )

        try:
            raw_ai_response = (
                response.content[0].text
                if isinstance(response.content, list)
                else str(response.content)
            )
            parsed_ai_analysis = json.loads(raw_ai_response)
            return parsed_ai_analysis
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to parse AI response: {str(e)}"
            )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating questions: {str(e)}"
        )


@router.post("/submit-question", tags=["ai"])
def submit_question(request: SubmitRequest):
    try:
        to_label = request.to_label
        prediction_result = request.prediction_result
        value = request.value
        question = request.question

        if not LabelType.__contains__(to_label):
            raise HTTPException(
                status_code=400, detail=f"Invalid prediction type: {to_label}"
            )

        if value is None:
            raise HTTPException(status_code=400, detail="Value cannot be None")

        # Update the prediction result with the new value
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


@router.post("/generate-task", tags=["ai"])
def generate_task(request: PredictionResult):
    try:
        today = datetime.today().date().strftime("%Y-%m-%d")
        start_date = today
        due_date = request.prediction["time_bound"][0]["text"]

        input = {
            "original_text": request.original_text,
            "prediction": request.prediction,
            "start_date": start_date,
            "due_date": due_date,
        }

        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            system="You are a SMART goal task generation assistant. Break down SMART goals into actionable tasks with clear timelines and measurable outcomes.",
            messages=[
                {
                    "role": "user",
                    "content": f"""
                        Generate Tasks for SMART Goal

                        INPUT:
                        {input}

                        TASK:
                        Generate a series of actionable tasks that will help achieve the SMART goal. Each task should:
                        1. Be specific and measurable
                        2. Have a clear deadline or recurring schedule
                        3. Contribute directly to achieving the main goal
                        4. Be realistic and achievable

                        OUTPUT FORMAT:
                        {{
                          "tasks": [
                            {{
                              "title": "Clear, action-oriented task title",
                              "description": "Brief description of what needs to be done",
                              "task_date": "YYYY-MM-DD",
                              "repeat_type": {{
                                "type": "none|daily|weekly|monthly",
                                "days": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
                                "monthly_timing": "START|MID|END"
                              }}
                            }}
                          ]
                        }}

                        RULES:
                        1. Task Creation:
                           - Create 7-14 distinct tasks that break down the goal
                           - Each task must be actionable and measurable
                           - Tasks should form a logical progression towards the goal

                        2. Timing Rules:
                           - All task_dates must be between {start_date} and {due_date}
                           - Space tasks appropriately across the available time
                           - For recurring tasks, set appropriate frequencies

                        3. Repeat Types:
                           - "none": One-time task
                           - "daily": Daily task with no specific days
                           - "weekly": Select 1-3 specific days
                           - "monthly": Choose START (1st-5th), MID (13th-17th), or END (25th-30th)

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
                          "tasks": [
                            {{
                              "title": "Track daily calorie intake",
                              "description": "Log all meals and snacks in fitness app, staying under 2000 calories",
                              "task_date": "2024-03-15",
                              "repeat_type": {{
                                "type": "daily",
                              }}
                            }},
                            {{
                              "title": "30-minute cardio workout",
                              "description": "Complete either jogging, cycling, or swimming",
                              "task_date": "2024-03-15",
                              "repeat_type": {{
                                "type": "weekly",
                                "days": ["MON", "WED", "FRI"]
                              }}
                            }},
                            {{
                              "title": "Monthly weight check and progress photo",
                              "description": "Record weight and take progress photos for tracking",
                              "task_date": "2024-03-15",
                              "repeat_type": {{
                                "type": "monthly",
                                "monthly_timing": "START"
                              }}
                            }}
                          ]
                        }}

                        Note: Return only valid JSON without comments or explanations.
                        """,
                },
            ],
        )

        try:
            raw_ai_response = (
                response.content[0].text
                if isinstance(response.content, list)
                else str(response.content)
            )
            parsed_ai_analysis = json.loads(raw_ai_response)
            return parsed_ai_analysis
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to parse AI response: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating task: {str(e)}")
