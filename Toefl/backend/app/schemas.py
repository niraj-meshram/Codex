from typing import Any

from pydantic import BaseModel, Field


class PromptResponse(BaseModel):
    task_type: str
    prompt_id: str
    title: str
    constraints: dict[str, Any]
    raw_text: str
    to_field: str | None = None
    subject: str | None = None
    bullet_points: list[str] = Field(default_factory=list)
    professor_prompt: str | None = None
    student_posts: list[str] = Field(default_factory=list)


class SubmitRequest(BaseModel):
    prompt_id: str
    user_text: str


class SubmitResponse(BaseModel):
    rule_checks: dict[str, Any]
    rubric_scores: dict[str, float]
    explanations: dict[str, str]
    overall_score: float
    feedback: dict[str, list[str]]
    improved_sample: str
    vocab_suggestions: list[str]


class HistoryItem(BaseModel):
    id: int
    prompt_id: str
    task_type: str
    user_text: str
    scores_json: dict[str, Any]
    created_at: str


class SentenceQuestion(BaseModel):
    question_id: str
    prompt: str
    response_template: list[str]
    tokens: list[str]


class SentenceSetResponse(BaseModel):
    set_id: str
    title: str
    directions: str
    time_minutes: int
    difficulty: str
    questions: list[SentenceQuestion]


class SentenceSubmitRequest(BaseModel):
    set_id: str
    answers: dict[str, str]


class SentenceSubmitResponse(BaseModel):
    total_questions: int
    correct_answers: int
    score_percent: float
    explanations: list[dict[str, Any]]
