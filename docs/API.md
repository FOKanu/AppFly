# Local HTTP API

Loopback FastAPI wrapper around the existing Python engine (scout → match → write → vault). It does **not** reimplement matching or scraping. Bind only to the local machine:

```bash
# from the repo root, with the venv active
uvicorn jobhunt.api.app:create_app --factory --host 127.0.0.1 --port 8787
```

Base URL: `http://127.0.0.1:8787`

CORS allows `http://localhost` / `http://127.0.0.1` frontend origins (any port). This API does not serve the React app.

Config is the same `config.yaml` / `AppConfig` as the CLI. There is no second YAML schema.

Until A0 relocates the package to `backend/`, these modules live at `src/jobhunt/api/` and `src/jobhunt/features/pipeline/`.

## Secret rules

- GET bodies **never** include API key values or last-4 digits.
- `GET /settings` reports `secrets.gemini` / `secrets.apify` as booleans from **environment presence** only (`GEMINI_API_KEY`, `APIFY_API_TOKEN` / `APIFY_TOKEN` / `APIFY_API_KEY`).
- `PUT /settings` rejects `gemini_api_key` and other secret fields. Use `PUT /settings/secrets/{name}` later (currently 501).

## Endpoints

### `GET /health`

```json
{ "ok": true }
```

Liveness only. Does not read the vault or env keys.

### `GET /jobs?status=`

List job summaries from vault `Jobs/*.md` notes. Optional `status` must be one of `inbox`, `shortlist`, `draft`, `approved`, `applied`, `skipped`.

Each row: `source_id`, `source`, `title`, `company`, `status`, `location`, `url`, `score`, `has_letter`, `crawl_allowed`.

Does not fetch listing URLs or return CV / letter bodies.

### `GET /jobs/{source_id}`

One **packet**: job fields plus a description excerpt and a letter excerpt when a letter note exists. Not the whole vault. Not `CV/Master.md`.

### `PATCH /jobs/{source_id}`

Body: `{ "status": "<STATUSES value>" }` only. Unknown keys are rejected. Updates the job note and regenerates `Home.md`.

### `POST /runs`

Runs the same pipeline as `jobhunt run` (scout → match → write, refresh Home, append `Runs/YYYY-MM-DD.md`). Returns counts plus `errors` (a failed step does not skip Home/run-note updates).

### `GET /runs`

Summaries of `Runs/*.md` (date, path, preview, `has_errors`). Newest filename first.

### `GET /settings`

Returns `vault_path`, `keywords`, `location`, `sources` (including public `apify.enabled` / `start_urls`), `health` flags (vault/CV/requirements/config existence), and `secrets: { gemini: bool, apify: bool }`.

### `PUT /settings`

Allowed keys: `vault_path`, `keywords`, `location`, `rss`, `sources` (`agentur`, `inbox`, `rss` only). Unknown keys → 422. Secret keys → 400.

RSS URLs are checked with `jobhunt.policy.assert_crawl_allowed`. Deny-listed feeds (LinkedIn, Indeed, …) are rejected.

### `PUT /settings/secrets/{name}` and `DELETE /settings/secrets/{name}`

Stub. `name` must be `gemini` or `apify`. Response: **501** `{ "detail": "implemented by secrets feature" }`. Does not store Keychain secrets.

## Errors

Standard FastAPI JSON: `{ "detail": "..." }` with 400 / 404 / 422 / 501 as appropriate. `POST /runs` is **200** even when a pipeline step recorded an error string (same as the CLI still writing a run note).
