# Features

One row per Cloud Agent package. Sibling agents add folders on parallel branches; do not implement another agent's screens or keychain here.

| ID | Package | Surface | Status | Notes |
| --- | --- | --- | --- | --- |
| A0 | Monorepo layout | `backend/` Python move, `frontend/` Vite scaffold, `docs/` | **This tree** | No real screens, no business API routes, no keychain. Health-only API. |
| A1 | HTTP API | `GET/PATCH /jobs`, `POST/GET /runs`, `GET/PUT /settings`, secret PUT/DELETE | Stub | Follow [API.md](API.md). GET must not return secret values. Reuse CLI feature functions; do not scrape deny-listed hosts. |
| A2 | Tonight | `frontend/src/features/tonight/` | Stub | Instrument-panel home: what to do tonight. Empty folder + README in A0. |
| A3 | Queue | `frontend/src/features/queue/` | Stub | Job list by status. No queue page in A0. |
| A4 | Packet | `frontend/src/features/packet/` | Stub | Sealed writer packet view (one job + CV slice). Do not rewrite `features/write` algorithms in A0. |
| A5 | Workflow | `frontend/src/features/workflow/` | Stub | Status transitions inbox → applied / skipped. Human still submits applications. |
| A6 | Memory | `frontend/src/features/memory/` | Stub | CV, requirements, company notes (vault). No new vault format in A0. |
| A7 | Activity | `frontend/src/features/activity/` | Stub | Run log / `Runs/` timeline. |
| A8 | Settings | `frontend/src/features/settings/` plus secret store | Stub | Key fields and OS keychain are **out of A0**. GET settings may only expose `secrets: { gemini: bool, apify: bool }`. |

Backend feature folders that already contain code: `scout`, `match`, `write` under `backend/src/jobhunt/features/`. Frontend feature folders in A0 are README-only.
