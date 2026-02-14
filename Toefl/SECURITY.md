# Security and Git Push Checklist

## Current Secret Exposure Status

No hardcoded API keys were found in tracked TOEFL source files during scan.

Runtime secret usage found:
- `backend/app/services/sentence_builder.py` reads `OPENAI_API_KEY` from environment.

## Required Pre-Push Checks

1. Ensure `.env` and `.env.local` are not staged:
```bash
git status --short
```

2. Scan staged changes for secrets:
```bash
git diff --cached | rg -n "OPENAI_API_KEY|sk-|ghp_|AKIA|SECRET|TOKEN|PASSWORD"
```

3. Confirm generated artifacts are excluded:
- `frontend/.next/`
- `backend/toefl_practice.db`
- `data/prompts/chroma/`

## Notes

- If any real key was ever committed in history, rotate it immediately.
- Keep API keys only in local env vars or untracked `.env` files.
