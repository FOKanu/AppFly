# Activity & logs

Run history, funnel, and errors for Jobhunt Copilot.

## What it shows

- **Pipeline funnel** — scouted / shortlisted / matcher-skip / letters written across loaded runs
- **Vault funnel** — job-note counts by status from GET /jobs
- **Run list** — newest first, with time window, model name, counts, vault path
- **Errors** — from GET /runs, after secret redaction

## Secret handling

`redactSecrets` strips Google `AIza…` keys, `sk-` tokens, `Bearer` headers, `GEMINI_API_KEY=` / `JOBSUCHE_API_KEY=` assignments, and JSON fields whose names look like `api_key` / `token` / `secret`. Replacement text is `[redacted]`.

## What it does not show

- Connector keys or last-4 suffixes
- Full letters or CV bodies
- Crawl / Easy Apply controls

## Data

`GET /runs` and `GET /jobs` at `VITE_API_BASE_URL` (default `http://127.0.0.1:8787`). Mock sample data is used when the local API is down.
