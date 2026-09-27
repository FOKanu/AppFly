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
| — | Mobile / tablet | Shared banners, `useBreakpoint`, queue/workflow empty states | **This tree** | Keeps `AppShell` chrome. Does not swap in `ResponsiveShell`. |
| — | CV variants | Upload Word/PDF, extract to `CV/<variant>.md`, pick CV per run | **Planned** | See backlog below. Do not render CV body in the UI. |
| S0 | Native storage | `store/`, SQLite + files, Documents + Workspace APIs, Vault UI | **This tree** | Obsidian optional one-shot import. See [STORAGE.md](STORAGE.md). Landed via `storage-v1`. |
| P0 | Prototype stabilize | CI workflow, `uv.lock`, profile→Vault, agent playbooks | **This tree** | On `integrate/prototype-v1`. |
| P3 | UI first-run truth | Settings/Vault copy matches live storage APIs | **Planned** | Not started (`feat/ui-firstrun-truth` not merged). Known gap: Packet "fetch listing" calls `POST /jobs/{id}/fetch`, which has no backend route, so it always fails. #18 only added the `X-AppFly` header to the frontend API clients. Planned by Grok, implemented by local coder (5090); Claude on call. |
| P4 | LLM provider config | Optional remote/local Gemini base URL + Keychain | **This tree (backend)** | PR #17. `gemini_api_base` in `config.yaml` or env `GEMINI_API_BASE` (YAML wins); key from Keychain `gemini`, then `GEMINI_API_KEY`. A failing letter is recorded in the write errors and the run continues. Config/env only: not in `GET/PUT /settings` or the UI. |
| P5 | Run progress + cancel | AppShell Stop → cancel; honest Workflow progress | **Partial (backend only)** | Backend cancel and run statuses shipped with P6 (#19). UI still pending: AppShell Stop only changes local state and never calls `POST /runs/{id}/cancel`; run polling gives up after ~60 s (120 × 500 ms) and shows "timed out"; the UI has no `cancelled` state. Claude on call for design. |
| P6 | Durable async runs | Persist `POST /runs` status in SqliteStore | **This tree (with limits)** | PR #19. Every transition is written to the `runs` table (native backend); one queued/running run per server process (`409`); cooperative cancel; SQLite WAL; `GET /runs` deduped by run id; runs left open by a crashed process are reported `failed` (interrupted). Limits: the lock is per process (CLI `jobhunt run` and the nightly job are not covered); cancel works only for runs in the current process (`404` otherwise); a Gemini call already in flight finishes first. |
| — | API hardening | Loopback `Host` allow-list, CORS allow-list, `X-AppFly: 1` on mutating requests | **This tree** | PR #18. Frontend API clients send the header. See [API.md](API.md) Security. |
| P7 | Prototype smoke | E2E happy path on integrate tip | **Planned** | Composer (merge/CI gate) runs smoke after W1/W2. |
| B2+B3 | Run outcome | `completed_with_errors` status + `interrupted` flag on `GET /runs/{id}` and `GET /runs` rows | **This tree (backend)** | `feat/backend-b2-b3`. A normal return with errors is `completed_with_errors`; a crash stays `failed`; a stale stored run is `failed` + `interrupted: true` (legacy error string kept). Staleness rule unchanged until B4 (heartbeats). No DB migration. |

Backend feature folders that already contain code: `scout`, `match`, `write`, `pipeline`, `secrets` under `backend/src/jobhunt/features/`. Storage lives under `backend/src/jobhunt/store/`. Frontend chrome is in `frontend/src/app/layout/`. Tonight, Workflow, Queue, Packet, Memory, Activity, Settings, and Profiles screens are live, including mobile/tablet edge states. Role playbooks: [docs/agents/](agents/README.md). Epic base: **`integrate/prototype-v1`**.

## Backlog

### CV upload and per-run picker

Match/write currently always read `CV/Master.md` (or the active native CV document). Word/PDF files without extract are ignored. Planned work (own PR on `integrate/prototype-v1` / later `integrate/mvp-v1`):

1. Accept Word/PDF uploads into `CV/originals/` (or alongside notes). Extract locally into `CV/<variant>.md` with frontmatter `type: cv`, `variant`, `source` filename. Keep the original file.
2. `GET /cvs` — id, label, filename, word count, last extracted. Never return CV body, `.docx`, or PDF bytes.
3. `active_cv` in `config.yaml` as the default for match/write; `POST /runs` body `{ "cv": "<id>" }` as the run override. Packet still gets one CV slice.
4. Memory: upload + picker. Tonight/Workflow: select which CV before Run Now.
5. Later (optional): per-job `cv:` frontmatter so two roles can coexist in one vault.

Constraints: no third-party parse unless explicitly chosen; originals stay out of git; GET never echoes extracted text; never mix two CVs into one writer packet.
