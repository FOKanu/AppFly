You are the local coder on AppFly. Implement ONLY the brief below. No planning essays.

REPO: FOKanu/AppFly (local checkout: ~/work/AppFly in WSL on the 5090 host)
BRANCH: feat/backend-run-visibility (already checked out from integrate/prototype-v1 @ b6a247f or later)

ALLOWED FILES:
- backend/src/jobhunt/store/types.py
- backend/src/jobhunt/store/sqlite/schema.py
- backend/src/jobhunt/store/sqlite/store.py
- backend/src/jobhunt/store/protocol.py
- backend/src/jobhunt/api/runner.py
- backend/src/jobhunt/api/routes/runs.py
- backend/src/jobhunt/api/schemas/runs.py
- backend/src/jobhunt/cli.py
- backend/tests/test_api_runs.py
- backend/tests/test_api_runs_durable.py
- backend/tests/test_cli_store.py
- backend/tests/test_b4_run_visibility.py
- docs/API.md
- docs/FEATURES.md
- docs/STORAGE.md
- launchd/com.jobhunt.nightly.plist
- README.md

FORBIDDEN: everything else, especially package.json, pyproject.toml, lockfiles, .github/, .env*, config.yaml, frontend/**

CONTEXT: Contract in docs/design/FOLLOW_UPS.md B4 (+ F4). Grok calls: SQLite is the lock; dead when heartbeat older than 60 s; CLI exits 75 when busy. Stage commands scout/match/write also take the lock (trigger cli).

BRIEF:
- CLI/nightly runs visible on GET /runs with trigger api|cli|nightly
- One active run across API + CLI via SQLite + heartbeat
- Cross-process cancel via store flag; _settle_stale only when heartbeat > 60 s stale
- F4: plist -> AppFly backend/.venv + run --trigger nightly; README note
- Busy CLI -> exit 75 with active run id

STEPS: See docs/design/FOLLOW_UPS.md B4 tests list. Schema v2 forward-only. Docstrings Purpose/Inputs/Returns/Does not.

INVARIANTS: deny-list untouched; no secrets/CV in GET; ACTIVE_STATUSES stays queued|running; live fresh heartbeat never interrupted; markdown backend keeps old behaviour (document limit).

CHECKS:
- cd backend && uv run python -m pytest -q
- cd backend && uv run --with ruff ruff check <changed .py files>
- git diff --check

DONE WHEN: checks pass; 409 while fresh CLI run active; exit 75 when busy; cancel cross-process works; plist updated.

RETURN: summary, invariant self-review, check output, risks. Do not commit.
