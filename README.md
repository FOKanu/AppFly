# Jobhunt Copilot

Local-first job copilot. Scout and matching stay on your machine. Gemini writes cover letters from a sealed packet. You approve in Obsidian (or later in the UI) and submit applications yourself.

This repo does **not** automate LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, or Glassdoor. It does **not** scrape those sites, including via Apify. The deny-list is enforced in `jobhunt.policy`.

Python lives in `backend/`. The UI scaffold lives in `frontend/`.

## Setup

Python 3.12+ and Node.js 20+ (for the UI scaffold). 16 GB is enough. The embedding model is ~470 MB on first `match`.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e "./backend[dev]"
cp .env.example .env
# Put your Gemini API key in .env
jobhunt init
```

`jobhunt init` creates `config.yaml` and a vault at `~/Documents/Job Search` (override with `--vault` or `vault_path` in config). Open that folder as an Obsidian vault.

Then:

1. Replace `CV/Master.md` with your real CV.
2. Paste 1–3 sent letters into `CV/Voice-samples.md`.
3. Edit `Requirements.md` properties (locations, banned terms, skip companies).
4. Adjust keywords and location in `config.yaml`.

Get a Gemini key at [Google AI Studio](https://aistudio.google.com/apikey). The Arbeitsagentur key defaults to the public client id `jobboerse-jobsuche`.

Frontend scaffold (no feature screens yet):

```bash
cd frontend
npm install
npm run dev      # Vite
npm run build    # production check
```

Copy `frontend/.env.example` to `frontend/.env` if you need to point at the API (`VITE_API_BASE_URL=http://127.0.0.1:8787`).

## Daily use

```bash
jobhunt scout    # fetch + inbox
jobhunt match    # filter + score (downloads the embedding model once)
jobhunt write    # Gemini letters for shortlisted jobs
jobhunt run      # all of the above + Runs/YYYY-MM-DD.md
```

Run backend tests from `backend/`:

```bash
cd backend
pytest
```

Morning loop in Obsidian:

1. Open `Home.md`.
2. Edit the letter.
3. Set the job `status` to `approved` or `skipped`.
4. Submit the application yourself.
5. Set `status: applied` and fill `applied`.

Clip a listing you already opened into `_inbox/` (title, company, URL). Scout parses the local file only and will **never HTTP-fetch** a deny-listed listing URL. Do not clip search-result pages.

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

- `backend/` — Python package, CLI, tests, health-only API
- `frontend/` — Vite + React + TypeScript instrument-panel scaffold
- `docs/` — architecture, API contract, feature ownership
- `vault-templates/` — Obsidian templates copied by `jobhunt init`

## Branching

GitHub Flow: protect `main`. While an epic is open, **all** related changes (backend, frontend, docs) land on `integrate/<epic>` — from agents or collaborators. Current epic: **`integrate/ui-v1`**. Full rules: [AGENTS.md](AGENTS.md) and `.cursor/rules/branch-strategy.mdc`.

Cut new epic work from `integrate/ui-v1`, not from `main`, until that branch is merged.

## Nightly schedule

A launchd template lives at [launchd/com.jobhunt.nightly.plist](launchd/com.jobhunt.nightly.plist) (weekdays 21:00, wrapped in `caffeinate`). After the venv exists:

```bash
mkdir -p .cache
cp launchd/com.jobhunt.nightly.plist ~/Library/LaunchAgents/
# Edit the plist if your paths differ, then:
launchctl load ~/Library/LaunchAgents/com.jobhunt.nightly.plist
```

Leave the lid open and the Mac plugged in if you can. `jobhunt run` is safe to re-run: existing `source_id`s are not duplicated; `draft` / `approved` / `applied` notes are not overwritten.

## Status values

`inbox` → `shortlist` → `draft` → `approved` → `applied`, or `skipped`.

Set `gemini: false` on a job note to keep it off the Writer.

## Out of scope

- Computer-use or mouse apply on job boards
- Scraping LinkedIn / Indeed / Stepstone / ZipRecruiter / Xing / Glassdoor (including via Apify)
- Local 8B/14B orchestrator
- Hermes / OpenClaw (the CLI is the hook for that later)
- Gmail drafts (optional follow-up)
