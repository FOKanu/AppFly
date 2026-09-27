# Jobhunt Copilot

Local-first job copilot. Scout and matching stay on your machine. Gemini writes cover letters from a sealed packet. You review and approve in the local UI and submit applications yourself.

This repo does **not** automate LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, or Glassdoor. It does **not** scrape those sites, including via Apify. The deny-list is enforced in `jobhunt.policy`.

Python lives in `backend/`. The UI lives in `frontend/`.

## Setup

Python 3.12+ and Node.js 20+ (for the UI). 16 GB is enough. The embedding model is ~470 MB on first `match`.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e "./backend[dev]"
jobhunt init           # writes config.yaml (+ .env from .env.example) and the native store
python -m jobhunt.api  # local API on http://127.0.0.1:8787
```

Storage: the **native store is the source of truth**. `jobhunt init` sets `storage_backend: native` and creates `appfly.sqlite` plus `files/` under the app data dir: `~/Library/Application Support/AppFly/` on macOS, `~/.local/share/appfly/` on Linux. Override it with `native_data_dir` in `config.yaml` or `APPFLY_DATA_DIR`. `jobhunt init --markdown` keeps the legacy Obsidian-vault backend (`vault_path`, default `~/Documents/Job Search`). Details: [docs/STORAGE.md](docs/STORAGE.md).

Frontend:

```bash
cd frontend
npm install
npm run dev      # Vite
npm run build    # production check
```

Copy `frontend/.env.example` to `frontend/.env` if you need to point at the API (`VITE_API_BASE_URL=http://127.0.0.1:8787`).

Then, in the UI:

1. **Settings**: paste your Gemini key. It goes to the OS keychain and is never returned by the API. `GEMINI_API_KEY` in `.env` also works as a fallback. Get a key at [Google AI Studio](https://aistudio.google.com/apikey). The Arbeitsagentur key defaults to the public client id `jobboerse-jobsuche`.
2. **Vault**: upload your CV and 1–3 sent letters as voice samples, and mark the active CV and voice sample.
3. Adjust keywords and location in `config.yaml` (or via `PUT /settings`).

Coming from an Obsidian vault? **Settings → Import from Obsidian** (`POST /workspace/import/obsidian`) copies `Jobs/`, `Letters/`, `CV/`, `Requirements.md` and `Runs/` into the native store **once**. There is no dual-write and no live sync, so later edits in Obsidian are not picked up.

## Daily use

Start a run from the UI (`POST /runs`) or the CLI:

```bash
jobhunt run      # scout -> match -> write against the configured store
```

`jobhunt scout`, `jobhunt match` and `jobhunt write` still exist, but they currently operate on the markdown vault at `vault_path`, not the native store. With the native backend, use `jobhunt run` or the UI.

Morning loop in the UI:

1. Open **Tonight** for the last run and the drafts waiting for review.
2. Open a job's packet and edit the letter (or regenerate it).
3. Mark it **approved** or **skipped**.
4. Submit the application yourself.
5. Set its status to `applied` (Queue status menu, or `PATCH /jobs/{source_id}`).

Clip a listing you already opened into the inbox folder: `files/inbox/` under the app data dir (`_inbox/` in markdown mode), with title, company and URL. Scout parses the local file only and will **never HTTP-fetch** a deny-listed listing URL. Do not clip search-result pages.

Run backend tests from `backend/`:

```bash
cd backend
pytest
```

API contract: [docs/API.md](docs/API.md).

## Crawl policy (accounts)

These hosts must never be crawled, RSS-fetched, or sent to Apify. Doing so can ban your accounts:

- linkedin.com
- indeed.com (including de.indeed.com)
- stepstone.de / stepstone.com
- ziprecruiter.com
- xing.com
- glassdoor.com / glassdoor.de
- wellfound.com / angel.co

The canonical list is `backend/src/jobhunt/policy.py` (`DENIED_CRAWL_HOSTS` / `DENIED_ROOT_DOMAINS`). Inbox may **store** those URLs; nothing in this repo may fetch them.

Allowed automated ingest: Arbeitsagentur API, RSS on other hosts, public company career/Impressum pages. Future Apify actors use `sources.apify.start_urls` and are rejected if any URL is on the deny-list. Leave `apify.enabled: false` until that crawler exists.

## Layout

- `backend/` — Python package, CLI, tests, local HTTP API
- `frontend/` — Vite + React + TypeScript instrument-panel UI
- `docs/` — architecture, API contract, feature ownership, agent playbooks
- `vault-templates/` — templates copied by `jobhunt init` (markdown mode / import)

## Branching

GitHub Flow: protect `main`. While an epic is open, **all** related changes (backend, frontend, docs) land on `integrate/<epic>` — from agents or collaborators. Current epic: **`integrate/prototype-v1`**. Full rules: [AGENTS.md](AGENTS.md) and `.cursor/rules/branch-strategy.mdc`.

Cut new epic work from `integrate/prototype-v1`, not from `main`, until that branch is merged.

Agent roles: Grok plans and opens epics, an RTX 5090 local coder implements, Composer runs CI/smoke and merges, Claude is on call for UI design. See [docs/agents/](docs/agents/README.md) and [docs/workflow/MULTI_AGENT.md](docs/workflow/MULTI_AGENT.md).

## Nightly schedule

A launchd template lives at [launchd/com.jobhunt.nightly.plist](launchd/com.jobhunt.nightly.plist) (weekdays 21:00, wrapped in `caffeinate`). After the venv exists:

```bash
mkdir -p .cache
cp launchd/com.jobhunt.nightly.plist ~/Library/LaunchAgents/
# Edit the plist if your paths differ, then:
launchctl load ~/Library/LaunchAgents/com.jobhunt.nightly.plist
```

Leave the lid open and the Mac plugged in if you can. `jobhunt run` is safe to re-run: existing `source_id`s are not duplicated; `draft` / `approved` / `applied` jobs are not overwritten.

## Status values

`inbox` → `shortlist` → `draft` → `approved` → `applied`, or `skipped`.

Set `gemini: false` on a job (`PATCH /jobs/{source_id}`) to keep it off the Writer.

## Out of scope

- Computer-use or mouse apply on job boards
- Scraping LinkedIn / Indeed / Stepstone / ZipRecruiter / Xing / Glassdoor (including via Apify)
- Local 8B/14B orchestrator
- Hermes / OpenClaw (the CLI is the hook for that later)
- Gmail drafts (optional follow-up)
