# Architecture

## Components

1. Frontend (`frontend/`)
- Next.js app pages for writing tasks and history.
- Calls backend using `NEXT_PUBLIC_API_BASE`.

2. Backend (`backend/app/`)
- FastAPI endpoints for prompt retrieval, submission grading, sentence tasks, and history.
- SQLite persistence through SQLAlchemy.

3. Prompt Data (`data/prompts/`)
- `prompts.json` stores parsed prompt bank.
- `chroma/` stores vector index created by ingestion.

4. Ingestion (`scripts/ingest_pdf.py`)
- Parses source PDF and emits structured prompt JSON.
- Builds/updates Chroma index.

## Request Flow

1. Frontend requests random prompt from backend.
2. Backend loads prompt store and returns selected prompt.
3. User submits answer.
4. Backend grades response and stores result in SQLite.
5. History endpoint returns recent submissions.
6. Sentence mode can optionally call OpenAI if `OPENAI_API_KEY` exists.

## API Summary

- `POST /api/prompts/random?task_type=email|discussion`
- `POST /api/submit`
- `GET /api/history`
- `POST /api/sentence/random?count=1..10&difficulty=normal|hard|very_hard`
- `POST /api/sentence/submit`
