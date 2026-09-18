# Local API (Phase 1)

Contract for the **local** Jobhunt HTTP API. Base URL for the frontend: `http://127.0.0.1:8787` (`VITE_API_BASE_URL`). The HTTP server is not fully implemented yet; `jobhunt.api.health()` is the optional in-process stub for `GET /health`.

This API never posts to job boards. Humans submit applications in the browser. No Easy Apply bots. No crawl of deny-listed hosts.

## Auth and secrets

- Local-only. Do not expose this port to the internet.
- Secrets are write-only. `GET` responses never include key material.
- Do not log `value` from secret writes.

## Statuses

`inbox`, `shortlist`, `draft`, `approved`, `applied`, `skipped`.

Typical flow: `inbox` → `shortlist` → `draft` → `approved` → `applied`, or `skipped` at any human decision.

## Endpoints

### `GET /health`

Liveness. Does not check the vault or API keys.

**Returns**

```json
{ "status": "ok" }
```

### `GET /jobs`

List job notes.

**Query**

| Name | Notes |
| --- | --- |
| `status` | Optional. One of the statuses above. Omit for all. |

**Returns** a JSON array of job summaries (`source_id`, `title`, `company`, `status`, `score`, …). Bodies may omit full descriptions if the list is large; use `GET /jobs/{source_id}` for one job.

### `GET /jobs/{source_id}`

One job note as stored in the vault (metadata + description). Inbox may include a deny-listed listing URL as a stored field; the API must not fetch that URL.

### `PATCH /jobs/{source_id}`

Update **status only** (human workflow). Body example:

```json
{ "status": "applied" }
```

Reject unknown statuses. This is not an apply button: it records that the human already submitted, skipped, or approved.

### `POST /runs`

Start a pipeline run (`scout` + `match` + `write` equivalent to `jobhunt run`). Returns quickly with a run id if execution is async, or a summary if sync.

Does not crawl `DENIED_CRAWL_HOSTS`. A denied Apify/RSS URL must **fail the run**.

### `GET /runs`

List run summaries (date, counts, errors). Backed by vault `Runs/`.

### `GET /settings`

Non-secret settings plus **booleans** for whether secrets exist.

**Returns (shape)**

```json
{
  "vault_path": "/path/to/vault",
  "sources": {
    "agentur": true,
    "inbox": true,
    "rss": [],
    "apify": { "enabled": false, "start_urls": [] }
  },
  "health": { "status": "ok" },
  "secrets": { "gemini": false, "apify": false }
}
```

`secrets.gemini` / `secrets.apify` are `true` when a value is configured. **Never** return the key strings.

### `PUT /settings`

Update non-secret settings (vault path, source toggles, keywords, caps). **No keys** in this body. Reject payloads that include `GEMINI_API_KEY`, `APIFY_TOKEN`, or similar.

### `PUT /settings/secrets/{name}`

Write-only secret upsert. `{name}` is `gemini` or `apify` (extend later with care).

**Body**

```json
{ "value": "<secret>" }
```

**Returns**

```json
{ "configured": true }
```

Do not echo `value`. Docs and examples must not use real keys.

### `DELETE /settings/secrets/{name}`

Clear that secret from whatever store the engine uses later (env/keychain). Returns `{ "configured": false }` or 204.

## Frontend rules

- `frontend/.env.example` contains only `VITE_API_BASE_URL=http://127.0.0.1:8787`.
- React must not import `jobhunt`, read the vault, or call Gemini/Apify HTTP APIs.
