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
| P3 | UI first-run truth | Settings/Vault copy matches live storage APIs | **This tree** | #25 (`feat/ui-firstrun-truth`). Error classification; Vault/Settings truth; Packet no longer calls missing `POST /jobs/{id}/fetch` (F1 deferred). |
| P4 | LLM provider config | Optional remote/local Gemini base URL + Keychain | **This tree (backend)** | PR #17. `gemini_api_base` in `config.yaml` or env `GEMINI_API_BASE` (YAML wins); key from Keychain `gemini`, then `GEMINI_API_KEY`. A failing letter is recorded in the write errors and the run continues. Config/env only: not in `GET/PUT /settings` or the UI. |
| P5 | Run progress + cancel | AppShell Stop → cancel; honest Workflow progress | **This tree** | Backend #19; UI W2-A–D (#29–#33) + Post-B1 (#37–#38) + Post-B4 (#41). Stop → `POST /runs/{id}/cancel`; long-poll + re-attach; `cancelled` / `interrupted` / stage-aware progress. |
| P6 | Durable async runs | Persist `POST /runs` status in SqliteStore | **This tree** | PR #19 + B4 (#40). Cross-process SQLite lock, heartbeat, CLI/nightly visibility, exit 75 when busy. Gemini in flight still finishes before cancel takes effect. |
| — | API hardening | Loopback `Host` allow-list, CORS allow-list, `X-AppFly: 1` on mutating requests | **This tree** | PR #18. Frontend API clients send the header. See [API.md](API.md) Security. |
| P7 | Prototype smoke | E2E happy path on integrate tip | **In progress** | Automated gate green on tip (`pytest` 110, `npm run build`). Manual happy path + human sign-off before `integrate/prototype-v1` → `main`. |
| B2+B3 | Run outcome | `completed_with_errors` status + `interrupted` flag on `GET /runs/{id}` and `GET /runs` rows | **This tree (backend)** | `feat/backend-b2-b3`. A normal return with errors is `completed_with_errors`; a crash stays `failed`; a stale stored run is `failed` + `interrupted: true`. Heartbeat staleness from B4. |
| B1 | Run progress | `stage` + live counts on `GET /runs/{id}` and `GET /runs` rows, `write_cap` on `GET /runs/{id}` | **This tree (backend)** | `feat/backend-b1`. `stage` is `scout` / `match` / `write` while running, `null` otherwise; counts update live; `write_cap` = config `letter_cap` for in-process runs. |
| B4 | Run visibility | CLI/nightly run records, `trigger`, SQLite cross-process lock, 60s heartbeat, cancel flag, exit 75 when busy; F4 nightly plist | **This tree (backend)** | `feat/backend-run-visibility` (#40). Native store only; markdown keeps legacy behaviour. |
| Post-B4 UI | Run chrome re-attach + Stop | `shared/run/useRunController.ts` | **This tree** | #41: re-attach any active run; Stop cancels cli/nightly via cross-process cancel. |

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
