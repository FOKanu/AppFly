# Architecture

Local-first job copilot: scout allowed sources, match the CV, draft letters, **human submits in the browser**. This repo is split so backend engine work and React UI work do not share files.

## Layout

```
AppFly/
  README.md
  AGENTS.md
  docs/ARCHITECTURE.md    ← you are here
  docs/FEATURES.md
  docs/API.md
  config.example.yaml     ← stays at repo root
  .env.example            ← stays at repo root (Gemini / Jobsuche keys)
  backend/                ← Python package `jobhunt`
  frontend/               ← Vite + React + TypeScript (scaffold)
  vault-templates/
  launchd/
```

## Layer diagram

```
┌─────────────────────────────────────────┐
│  frontend/  (React, Vite, TypeScript)   │
│  screens in src/features/*              │
│  HTTP client in src/shared/api/         │
└──────────────────┬──────────────────────┘
                   │  local HTTP only
                   │  VITE_API_BASE_URL=http://127.0.0.1:8787
                   ▼
┌─────────────────────────────────────────┐
│  local API  (Phase 1 contract)          │
│  docs/API.md  — health, jobs, runs,     │
│  settings. Secrets are write-only.      │
│  Stub today: jobhunt.api.health()       │
└──────────────────┬──────────────────────┘
                   │  in-process calls
                   ▼
┌─────────────────────────────────────────┐
│  jobhunt engine  (backend/src/jobhunt)  │
│  policy.py · CLI · features/*           │
│  scout → match → write → runlog         │
└──────────────────┬──────────────────────┘
                   │  markdown files
                   ▼
┌─────────────────────────────────────────┐
│  Obsidian vault  (vault_path)           │
│  Jobs/ Letters/ Runs/ _inbox/ Home.md   │
└─────────────────────────────────────────┘
```

**Frontend and backend never mix.** No JSX in Python. No vault I/O and no Gemini/Apify HTTP from React. The browser talks only to the local API. The engine is the only process that reads the vault or calls Gemini.

## Crawl policy

Enforced in `jobhunt.policy` (`DENIED_CRAWL_HOSTS`, `assert_crawl_allowed`). Inbox may **store** LinkedIn/Indeed/Stepstone/… URLs from clips the user already opened. Nothing may HTTP-GET those hosts or send them to Apify. Fail the run; do not skip silently. No Easy Apply bots.

## Where code lives

| Concern | Canonical path | Compatibility import |
| --- | --- | --- |
| Scout sources | `backend/src/jobhunt/features/scout/` | `jobhunt.scout` |
| Match | `backend/src/jobhunt/features/match/` | `jobhunt.match` |
| Write | `backend/src/jobhunt/features/write/` | `jobhunt.write` |
| Vault I/O | `backend/src/jobhunt/features/vault/` | `jobhunt.vault` |
| Run notes | `backend/src/jobhunt/features/runlog/` | `jobhunt.runlog` |
| Policy, models, config, CLI | `backend/src/jobhunt/` (package root) | same |
| UI screens | `frontend/src/features/<name>/` | — |

**New engine code** goes under `backend/src/jobhunt/features/<feature>/`. Do not grow `cli.py`, `policy.py`, `models.py`, or `config.py` into god files. Shims at the old module paths only re-export; edit the feature folder.

## How to add a new scout source

1. Add `backend/src/jobhunt/features/scout/<source>.py` with a function like `fetch_<source>_jobs(...) -> list[Job]`.
2. **Before any HTTP GET, RSS pull, or Apify `start_url`**, call `assert_crawl_allowed(url, source="<source>")`.
3. Register the fetcher in `collect_jobs` in `backend/src/jobhunt/features/scout/__init__.py` (toggle it from `AppConfig.sources` if it is optional).
4. Inbox-style sources must parse **local files only** and must not fetch the listing URL.
5. Add tests in `backend/tests/`. Read the folder README: `backend/src/jobhunt/features/scout/README.md`.

Do not add a scraper for a host in `DENIED_CRAWL_HOSTS`.

## How to add a new UI screen

1. Create `frontend/src/features/<name>/` with a short `README.md` (purpose, main files, how to extend) and the page component.
2. Append a row to `APP_ROUTES` in `frontend/src/routes.ts` (`path`, `feature`, `title`).
3. Import the page in `frontend/src/app/App.tsx` and use it on that route instead of the placeholder.
4. Fetch through `frontend/src/shared/api/` against `VITE_API_BASE_URL` only.
5. Add a row to `docs/FEATURES.md`.

Keep `App.tsx` as providers + router. Put chrome in `frontend/src/app/layout/`. Shared widgets go in `frontend/src/shared/ui/`.

## Comment standard

Every **module** and every **exported** function, class, or component gets a purpose docstring with four labels:

- **Purpose** — what it is for
- **Inputs** — arguments or files it reads
- **Returns** — what callers get
- **Does not** — hard boundaries (no crawl, no secrets in logs, no vault from React)

Do not comment every line. Junior-readable names; small functions; one feature per folder.

## Secrets

- Live in repo-root `.env` (see `.env.example`). Never commit `.env`.
- Do not log keys. Do not put real key values in docs.
- Frontend env may contain **only** `VITE_API_BASE_URL`. No Gemini or Apify keys in `frontend/`.
- `GET /settings` returns `{ gemini: bool, apify: bool }` for secret **presence**, never the values.
- `PUT /settings/secrets/{name}` is write-only; `DELETE` clears. See `docs/API.md`.

## Install and run

From the repo root:

```bash
make install          # pip install -e ./backend[dev]  +  frontend npm install
make test-backend     # pytest in backend/
jobhunt --help
make frontend-dev     # Vite
make frontend-build
```

Equivalent without Make:

```bash
python3.12 -m pip install -e "./backend[dev]"
cd backend && pytest
jobhunt --help
cd frontend && npm install && npm run build
```

`config.py` walks up from the installed package until it finds `vault-templates/` and `config.example.yaml`, so vault templates and `config.yaml` stay at the **repo root**.
