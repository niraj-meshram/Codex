# TOEFL Writing Practice App

TOEFL practice platform with:
- Next.js frontend (`frontend/`)
- FastAPI backend (`backend/`)
- Prompt ingestion pipeline (`scripts/ingest_pdf.py`)

## Quick Start

```bash
npm install
npm run dev
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Environment

Backend sentence generation can optionally use OpenAI:

```bash
# backend runtime environment
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Do not commit `.env` files. See `SECURITY.md`.

## Project Structure

```text
backend/
frontend/
data/prompts/
scripts/ingest_pdf.py
```

## Architecture Flow Diagram

```mermaid
flowchart TD
    U[User Browser] --> F[Next.js Frontend]
    F -->|POST /api/prompts/random| B[FastAPI Backend]
    F -->|POST /api/submit| B
    F -->|POST /api/sentence/random| B
    F -->|POST /api/sentence/submit| B
    F -->|GET /api/history| B

    B --> P[Prompt Store: data/prompts/prompts.json]
    B --> D[(SQLite: backend/toefl_practice.db)]
    B --> G[Rule-based Grading]
    B --> S[Sentence Builder]
    S --> O[OpenAI API optional via OPENAI_API_KEY]

    I[Ingestion Script] -->|PDF parse| P
    I --> C[(Chroma Index: data/prompts/chroma/)]
```

More detail: `ARCHITECTURE.md`.
