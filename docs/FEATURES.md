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
| S0 | Native storage | `store/`, SQLite + files, Documents + Workspace APIs, Vault UI | **This tree** | Obsidian optional one-shot import. See [STORAGE.md](STORAGE.md). Epic base: `integrate/storage-v1`. |

Backend feature folders that already contain code: `scout`, `match`, `write`, `pipeline`, `secrets` under `backend/src/jobhunt/features/`. Storage lives under `backend/src/jobhunt/store/`. Frontend chrome is in `frontend/src/app/layout/`. Tonight, Workflow, Queue, Packet, Memory, Activity, Settings, and Profiles screens are live, including mobile/tablet edge states.

## Backlog

### CV upload and per-run picker

Match/write currently always read `CV/Master.md`. Word/PDF files in the vault are ignored. Planned work (own PR on `integrate/ui-v1` after the first markdown-CV run):

1. Accept Word/PDF uploads into `CV/originals/` (or alongside notes). Extract locally into `CV/<variant>.md` with frontmatter `type: cv`, `variant`, `source` filename. Keep the original file.
2. `GET /cvs` — id, label, filename, word count, last extracted. Never return CV body, `.docx`, or PDF bytes.
3. `active_cv` in `config.yaml` as the default for match/write; `POST /runs` body `{ "cv": "<id>" }` as the run override. Packet still gets one CV slice.
4. Memory: upload + picker. Tonight/Workflow: select which CV before Run Now.
5. Later (optional): per-job `cv:` frontmatter so two roles can coexist in one vault.

Constraints: no third-party parse unless explicitly chosen; originals stay out of git; GET never echoes extracted text; never mix two CVs into one writer packet.
