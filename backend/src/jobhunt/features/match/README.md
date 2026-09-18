# Match

Purpose: Local hard filters plus a small embedding model. Promotes inbox jobs to `shortlist`.

## Main files

- `__init__.py` — `match_jobs`, `hard_filter`, `why_match`, `score_jobs`

Compatibility imports: `jobhunt.match`.

## How to extend

Add helpers next to `match_jobs` or split a new module in this folder. Keep scoring on-device; do not call Gemini here. Tests: `backend/tests/test_match.py`.
