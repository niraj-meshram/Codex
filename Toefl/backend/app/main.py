import json

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import PromptUsage, SentenceSetCache, StudentPromptHistory, Submission
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


def _ensure_submission_columns() -> None:
    # Lightweight migration for existing SQLite DBs.
    with engine.begin() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(submissions)")).fetchall()]
        if "prompt_json" not in cols:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN prompt_json TEXT"))
        if "student_id" not in cols:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN student_id TEXT"))


_ensure_submission_columns()


@app.post("/api/prompts/random", response_model=PromptResponse)
def random_prompt(
    task_type: str = Query(..., pattern="^(email|discussion)$"),
    student_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    prompt_store.reload()
    all_source_ids = set(prompt_store.source_ids_by_type(task_type))
    if student_id:
        used_rows = (
            db.query(StudentPromptHistory)
            .filter(StudentPromptHistory.task_type == task_type, StudentPromptHistory.student_id == student_id)
            .all()
        )
        used_source_ids = {r.source_prompt_id for r in used_rows}
        if all_source_ids and used_source_ids.issuperset(all_source_ids):
            (
                db.query(StudentPromptHistory)
                .filter(StudentPromptHistory.task_type == task_type, StudentPromptHistory.student_id == student_id)
                .delete()
            )
            db.commit()
            used_source_ids = set()
    else:
        used_rows = db.query(PromptUsage).filter(PromptUsage.task_type == task_type).all()
        used_source_ids = {r.source_prompt_id for r in used_rows}
        if all_source_ids and used_source_ids.issuperset(all_source_ids):
            db.query(PromptUsage).filter(PromptUsage.task_type == task_type).delete()
            db.commit()
            used_source_ids = set()

    prompt = prompt_store.random_by_type(task_type, exclude_source_ids=used_source_ids)
    if not prompt:
        raise HTTPException(
            status_code=404,
            detail="No prompts found. Run scripts/ingest_pdf.py to generate data/prompts/prompts.json",
        )
    source_prompt_id = str(prompt.get("source_prompt_id") or prompt.get("prompt_id") or "")
    if source_prompt_id:
        if student_id:
            existing = (
                db.query(StudentPromptHistory)
                .filter(
                    StudentPromptHistory.task_type == task_type,
                    StudentPromptHistory.student_id == student_id,
                    StudentPromptHistory.source_prompt_id == source_prompt_id,
                )
                .first()
            )
            if not existing:
                db.add(
                    StudentPromptHistory(
                        student_id=student_id,
                        task_type=task_type,
                        prompt_id=str(prompt.get("prompt_id") or ""),
                        source_prompt_id=source_prompt_id,
                    )
                )
                db.commit()
        else:
            existing = (
                db.query(PromptUsage)
                .filter(PromptUsage.task_type == task_type, PromptUsage.source_prompt_id == source_prompt_id)
                .first()
            )
            if not existing:
                db.add(PromptUsage(task_type=task_type, source_prompt_id=source_prompt_id))
                db.commit()
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
        student_id=payload.student_id,
        task_type=prompt.get("task_type", "unknown"),
        user_text=payload.user_text,
        scores_json=json.dumps(result),
        prompt_json=json.dumps(prompt),
    )
    db.add(row)
    db.commit()

    return result


@app.get("/api/history", response_model=list[HistoryItem])
def history(student_id: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Submission)
    if student_id:
        query = query.filter(Submission.student_id == student_id)
    rows = query.order_by(Submission.created_at.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "prompt_id": r.prompt_id,
            "student_id": r.student_id,
            "task_type": r.task_type,
            "user_text": r.user_text,
            "scores_json": json.loads(r.scores_json),
            "prompt_snapshot": json.loads(r.prompt_json) if r.prompt_json else None,
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
        prompt_json=None,
    )
    db.add(row)
    db.commit()
    return result
