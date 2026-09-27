# Jobhunt backend

Python package `jobhunt`: CLI (`init`, `scout`, `match`, `write`, `run`) plus a local FastAPI app (jobs, runs, settings, secrets, documents, workspace).

```bash
pip install -e ".[dev]"   # from this directory
# or from the repo root: pip install -e "./backend[dev]"
pytest
```

API (default loopback):

```bash
uvicorn jobhunt.api.app:app --host 127.0.0.1 --port 8787
```

Config, `.env`, and `vault-templates/` stay at the **repository root**, not in this folder. Feature code lives under `src/jobhunt/features/`. Native store under `src/jobhunt/store/`. Crawl policy: `src/jobhunt/policy.py`. Contract: [`docs/API.md`](../docs/API.md).
