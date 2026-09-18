# Features

One row per Cloud Agent package. Sibling agents add folders on parallel branches; do not implement another agent's screens or keychain here.

| ID | Package | Surface | Status | Notes |
| --- | --- | --- | --- | --- |
| A0 | Monorepo layout | `backend/` Python move, `frontend/` Vite scaffold, `docs/` | **This tree** | No real screens, no business API routes, no keychain. Health-only API. |
| A1 | HTTP API | `GET/PATCH /jobs`, `POST/GET /runs`, `GET/PUT /settings`, secret PUT/DELETE | **This tree** | Routes under `backend/src/jobhunt/api/`. GET must not return secret values. |
| A2 | Write-only secrets | `PUT/DELETE /settings/secrets/{name}`, Keychain store | **This tree** | `backend/src/jobhunt/features/secrets/`. Flags only on GET `/settings`. |
| A3 | App chrome | `frontend/src/app/layout/`, routes, shared controls | **This tree** | Sidebar, header, run bar. Feature screens are still placeholders. |
| A4 | Tonight | `frontend/src/features/tonight/` | **This tree** | Home dashboard; mock fallback if the API is down. |
| A5 | Workflow | `frontend/src/features/workflow/` | **This tree** | Scout → Match → Write stepper. Same handover as Tonight. |
| A6 | Packet | `frontend/src/features/packet/` | **This tree** | Sealed one-job packet. Approve/skip via PATCH; human submits. |
| — | Queue | `frontend/src/features/queue/` | **This tree** | Master-detail job list. Same handover as Packet. |
| — | Memory | `frontend/src/features/memory/` | **This tree** | Vault/profile overview. CV body is never rendered. |
| A7 | Activity | `frontend/src/features/activity/` | **This tree** | Run log timeline; error text is redacted. |
| A8 | Settings | `frontend/src/features/settings/` | **This tree** | Write-only key fields. GET never shows secret values. |

Backend feature folders that already contain code: `scout`, `match`, `write`, `pipeline`, `secrets` under `backend/src/jobhunt/features/`. Frontend chrome is in `frontend/src/app/layout/`. Tonight, Workflow, Queue, Packet, Memory, Activity, and Settings screens are live. Mobile/tablet edge states still land next.
