# Features

One row per Cloud Agent package. Sibling agents add folders on parallel branches; do not implement another agent's screens or keychain here.

| ID | Package | Surface | Status | Notes |
| --- | --- | --- | --- | --- |
| A0 | Monorepo layout | `backend/` Python move, `frontend/` Vite scaffold, `docs/` | **This tree** | No real screens, no business API routes, no keychain. Health-only API. |
| A1 | HTTP API | `GET/PATCH /jobs`, `POST/GET /runs`, `GET/PUT /settings`, secret PUT/DELETE | **This tree** | Routes under `backend/src/jobhunt/api/`. GET must not return secret values. |
| A2 | Write-only secrets | `PUT/DELETE /settings/secrets/{name}`, Keychain store | **This tree** | `backend/src/jobhunt/features/secrets/`. Flags only on GET `/settings`. |
| A3 | App chrome | `frontend/src/app/layout/`, routes, shared controls | **This tree** | Sidebar, header, run bar. Feature screens are still placeholders. |
| A4 | Packet | `frontend/src/features/packet/` | Stub | Sealed writer packet view (one job + CV slice). Do not rewrite `features/write` algorithms in A0. |
| A5 | Workflow | `frontend/src/features/workflow/` | Stub | Status transitions inbox → applied / skipped. Human still submits applications. |
| A6 | Memory | `frontend/src/features/memory/` | Stub | CV, requirements, company notes (vault). No new vault format in A0. |
| A7 | Activity | `frontend/src/features/activity/` | Stub | Run log / `Runs/` timeline. |
| A8 | Settings | `frontend/src/features/settings/` | Stub | Key fields; OS keychain is A2. GET settings may only expose `secrets: { gemini: bool, apify: bool, jobsuche: bool }`. |

Backend feature folders that already contain code: `scout`, `match`, `write`, `pipeline`, `secrets` under `backend/src/jobhunt/features/`. Frontend chrome is in `frontend/src/app/layout/`. Feature screens (Tonight, Queue, Packet, …) are still placeholders until those packages land.
