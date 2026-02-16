import json

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import SentenceSetCache, Submission
from .schemas import HistoryItem, PromptResponse, SubmitRequest, SubmitResponse
from .schemas import SentenceSetResponse, SentenceSubmitRequest, SentenceSubmitResponse
from .services.grading import evaluate_submission
from .services.prompt_store import prompt_store
from .services.sentence_builder import generate_sentence_set, get_runtime_set, grade_sentence_set, register_runtime_set

app = FastAPI(title="TOEFL Writing Practice API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.post("/api/prompts/random", response_model=PromptResponse)
def random_prompt(task_type: str = Query(..., pattern="^(email|discussion)$")):
    prompt_store.reload()
    prompt = prompt_store.random_by_type(task_type)
    if not prompt:
        raise HTTPException(
            status_code=404,
            detail="No prompts found. Run scripts/ingest_pdf.py to generate data/prompts/prompts.json",
        )
    return prompt


@app.post("/api/submit", response_model=SubmitResponse)
def submit(payload: SubmitRequest, db: Session = Depends(get_db)):
    prompt_store.reload()
    prompt = prompt_store.get_prompt_by_id(payload.prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    result = evaluate_submission(prompt, payload.user_text)

    row = Submission(
        prompt_id=payload.prompt_id,
        task_type=prompt.get("task_type", "unknown"),
        user_text=payload.user_text,
        scores_json=json.dumps(result),
    )
    db.add(row)
    db.commit()

    return result


@app.get("/api/history", response_model=list[HistoryItem])
def history(db: Session = Depends(get_db)):
    rows = db.query(Submission).order_by(Submission.created_at.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "prompt_id": r.prompt_id,
            "task_type": r.task_type,
            "user_text": r.user_text,
            "scores_json": json.loads(r.scores_json),
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]


@app.post("/api/sentence/random", response_model=SentenceSetResponse)
def sentence_random(
    count: int = Query(10, ge=1, le=10),
    difficulty: str = Query("hard", pattern="^(normal|hard|very_hard|extra_tough)$"),
    db: Session = Depends(get_db),
):
    try:
        public_set = generate_sentence_set(count=count, difficulty=difficulty)
        runtime_set = get_runtime_set(public_set["set_id"])
        if runtime_set:
            existing = db.query(SentenceSetCache).filter(SentenceSetCache.set_id == public_set["set_id"]).first()
            payload_json = json.dumps(runtime_set)
            if existing:
                existing.payload_json = payload_json
            else:
                db.add(SentenceSetCache(set_id=public_set["set_id"], payload_json=payload_json))
            db.commit()
        return public_set
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/sentence/submit", response_model=SentenceSubmitResponse)
def sentence_submit(payload: SentenceSubmitRequest, db: Session = Depends(get_db)):
    result = grade_sentence_set(payload.set_id, payload.answers)
    if not result:
        cached = db.query(SentenceSetCache).filter(SentenceSetCache.set_id == payload.set_id).first()
        if cached:
            try:
                restored = json.loads(cached.payload_json)
                if isinstance(restored, dict):
                    register_runtime_set(payload.set_id, restored)
                    result = grade_sentence_set(payload.set_id, payload.answers)
            except json.JSONDecodeError:
                result = None
    if not result:
        raise HTTPException(status_code=404, detail="Sentence set not found. Start a new set.")

    row = Submission(
        prompt_id=payload.set_id,
        task_type="sentence_building",
        user_text=json.dumps(payload.answers),
        scores_json=json.dumps(result),
    )
    db.add(row)
    db.commit()
    return result
