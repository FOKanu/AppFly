You are the local coder on AppFly. Implement ONLY the brief below. No planning essays.

REPO: FOKanu/AppFly (local checkout: ~/work/AppFly in WSL on the 5090 host)
BRANCH: feat/backend-run-cv (already checked out from integrate/mvp-v1 @ 0e03cc2 or later)

ALLOWED FILES:
- backend/src/jobhunt/api/routes/runs.py
- backend/src/jobhunt/api/schemas/runs.py
- backend/src/jobhunt/api/runner.py
- backend/src/jobhunt/features/pipeline/run_all.py
- backend/src/jobhunt/features/write/letters.py
- backend/src/jobhunt/features/match/matcher.py
- backend/tests/test_run_cv.py
- docs/API.md
- docs/FEATURES.md

FORBIDDEN: everything else, especially package.json, pyproject.toml, lockfiles, .github/, .env*, config.yaml, frontend/**, policy.py, secrets/**

CONTEXT: M1 landed (document extract + extract_status). M2 is POST /runs optional body { "cv": "<document_id>" }. Writer and matcher must use that CV document text for the whole run. Default remains active_cv when cv omitted. Sealed packet still one CV slice. List/GET documents still never return CV body.

BRIEF:
1. Add optional request body model for POST /runs with field cv: str | None = None (extra=forbid).
2. If cv is set: resolve store.get_document(cv); if missing or kind != "cv" return HTTP 404 with clear detail. Load text via store.document_text(cv) (empty string OK if extract empty).
3. If cv omitted: use store.read_cv() as today (active CV).
4. Thread the resolved cv_text through start_async_run -> run_all -> match_jobs and write_letters as an optional cv_text parameter. Do not call read_cv again inside match/write when cv_text is provided.
5. write_letters must still build ONE sealed packet per job with that single cv_text slice (_cv_slice). Never mix two CVs.
6. Tests in backend/tests/test_run_cv.py (new file):
   - POST /runs with no body still 200 (monkeypatch run_all as existing durable tests do).
   - POST /runs with {"cv":"<id>"} for an uploaded active/non-active cv document uses that doc (assert via monkeypatch capturing kwargs or by checking write_letters received cv_text).
   - POST /runs with unknown cv id -> 404.
   - POST /runs with a non-cv document id -> 404.
   - Assert sealed: write_letters / build_packet path still uses one cv_text (unit-level is fine).
7. Update docs/API.md POST /runs row: optional JSON body { "cv": "<id>" }.
8. Update docs/FEATURES.md M2 row to **This tree** with a short note.

STEPS: Prefer small SEARCH/REPLACE style edits. Docstrings Purpose/Inputs/Returns/Does not on new public functions.

INVARIANTS:
- Deny-list / policy.py untouched
- No secrets or CV body in GET /documents or GET /runs responses
- One CV slice per letter packet
- Empty body POST /runs remains valid (backward compatible)
- Native + markdown stores both work via existing get_document / document_text / read_cv

CHECKS:
- cd backend && uv run python -m pytest -q
- git diff --check

DONE WHEN: checks pass; optional cv id selects document text; missing/wrong kind -> 404; default active_cv unchanged.

RETURN: summary, invariant self-review, check output, risks. Do not commit.
