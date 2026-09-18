# Memory & profiles

Read-only vault / profile overview for Jobhunt Copilot.

## What it shows

- **Vault stats** — vault path and job-note counts by status (`inbox` → `applied`, plus `skipped`)
- **CV** — path and word/char/section counts when the API provides stats
- **Voice samples** — path and sample count
- **Requirements** — locations, languages, banned-term / skip-company counts, tone
- **Search presets** — keywords, location, radius, published window, source toggles

## What it does not show

- Full CV or voice-sample markdown (bodies are measured then discarded)
- Connector API keys, last-4, or `.env` values
- Job-board scrape actions (LinkedIn / Indeed / Stepstone / ZipRecruiter / Xing / Glassdoor stay deny-listed)

## Data

`GET /settings` and `GET /jobs` at `VITE_API_BASE_URL` (default `http://127.0.0.1:8787`). If the local API is down, the page falls back to sample counts — still no CV body.
