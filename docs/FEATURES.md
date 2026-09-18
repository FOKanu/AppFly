# Jobhunt Copilot features

Local-first job copilot. Scout and match stay on the machine. Gemini writes letters from a sealed packet (one job + CV slice). You approve in Obsidian and submit applications yourself.

This product does **not** crawl or Apify-scrape LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, Wellfound, or AngelList. Enforcement lives in `jobhunt.policy`.

## CLI (existing)

- `jobhunt init` — config + Obsidian vault from templates
- `jobhunt scout` — Arbeitsagentur API, RSS (non-deny-listed), `_inbox/` clips
- `jobhunt match` — hard filters + local embeddings
- `jobhunt write` — Gemini letters, cap per run
- `jobhunt run` — scout → match → write + `Runs/YYYY-MM-DD.md`

## Frontend screens

The UI talks to a local API at `http://127.0.0.1:8787` (`VITE_API_BASE_URL`). Screens fall back to sample data if the API is down.

### Memory & profiles (`/memory`)

Read-only vault map: CV path and counts, voice-sample counts, requirements chips, search presets (keywords / location / sources), and job-note counts by status from `GET /settings` and `GET /jobs`.

**Does not** dump the CV body into the DOM (if the API only has stats, only stats and paths are shown; if a body sneaks in, it is measured then discarded). **Does not** collect connector keys.

### Activity & logs (`/activity`)

Run history and errors from `GET /runs`, plus a pipeline/vault funnel (run totals + `GET /jobs` counts by status). Log text is passed through secret redaction (`AIza…`, `sk-`, `Bearer`, `GEMINI_API_KEY=`, JSON `api_key` fields) before render.

**Does not** start Easy Apply, show API keys, or add scrape buttons.

## Out of scope here

Queue / packet editor, Settings key entry, backend rewrite, computer-use apply bots.
