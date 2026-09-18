# HTTP API

A0 mounts GET `/health` only (`jobhunt.api.app:app`). A1 adds jobs, runs, and settings routes from `docs/API.md`. GET bodies must never include secret values; settings may return `secrets: { gemini: bool, apify: bool }` presence flags only. Run later with `uvicorn jobhunt.api.app:app --host 127.0.0.1 --port 8787` from an environment where `backend` is installed editable.
