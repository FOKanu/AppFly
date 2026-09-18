# Job hunt copilot

Python-first job copilot that writes into a **dedicated Obsidian vault**. Scout and matching stay on your Mac. Gemini writes cover letters from a sealed packet. You approve in Obsidian and submit applications yourself.

This repo does **not** automate LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, or Glassdoor. It does **not** scrape those sites, including via Apify. The deny-list is enforced in `jobhunt.policy`.

## What it does

1. **Scout** — Arbeitsagentur Jobsuche API, optional RSS feeds, and notes you drop in `_inbox/` (Obsidian Web Clipper).
2. **Match** — hard filters from `Requirements.md` plus a small local embedding model.
3. **Write** — Gemini Flash writes up to five letters per run from CV + one job excerpt + voice samples.
4. **Home.md** — regenerated table of `shortlist` / `draft` / `approved` jobs.

## Setup

Python 3.12+ (system `python3` on this Mac may still be 3.9). 16 GB is enough. The embedding model is ~470 MB on first `match`.

```bash
cd "/Users/franciskanu/Projects/Job Application Automation"
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
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

## Daily use

```bash
jobhunt scout    # fetch + inbox
jobhunt match    # filter + score (downloads the embedding model once)
jobhunt write    # Gemini letters for shortlisted jobs
jobhunt run      # all of the above + Runs/YYYY-MM-DD.md
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

Allowed automated ingest: Arbeitsagentur API, RSS on other hosts, public company career/Impressum pages. Future Apify actors use `sources.apify.start_urls` and are rejected if any URL is on the deny-list. Leave `apify.enabled: false` until that crawler exists.

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
- Custom organism web UI
- Hermes / OpenClaw (the CLI is the hook for that later)
- Gmail drafts (optional follow-up)

## Tests

```bash
pytest
```
