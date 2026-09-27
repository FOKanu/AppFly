# HTTP API contract

Local FastAPI app (`jobhunt.api.app:app`), default bind `http://127.0.0.1:8787`.

**A0 shipped `GET /health`. A1 added jobs/runs/settings. A2 stores connector keys write-only.** No computer-use, no Easy Apply, no crawling deny-listed hosts from these handlers.

**Secrets never appear in GET bodies.** Settings GET may include presence flags only: `secrets: { gemini: bool, apify: bool, jobsuche: bool }`. `true` means the write-only store has a value, not that the key is valid. Env fallbacks still work for the engine.

| Method | Path | Purpose | Inputs | Returns | Does not |
| --- | --- | --- | --- | --- | --- |
| GET | `/health` | Liveness probe | none | `{ "ok": true, "status": "ok" }` | Read keys, list jobs, touch the vault |
| GET | `/jobs` | List job notes | query `status=` (optional; `inbox`, `shortlist`, `draft`, `approved`, `applied`, `skipped`) | Job summaries (source_id, title, company, status, score, url, crawl_allowed, …) | Fetch listing URLs; return API keys |
| GET | `/jobs/{source_id}` | One job | path `source_id` | Job note payload (frontmatter + body excerpt) | HTTP-GET the job's `url` |
| PATCH | `/jobs/{source_id}` | Update job metadata | JSON patch: `status`, `gemini`, `applied`, … | Updated job | Submit the application |
| POST | `/runs` | Start a pipeline run | JSON: which stages (`scout`, `match`, `write`) or full run | Run id + accepted status | Crawl deny-listed hosts; hide `CrawlDeniedError` |
| GET | `/runs` | List run logs | optional date query | Run summaries from `Runs/` | Include env secrets |
| GET | `/settings` | Read non-secret settings | none | Keywords, location, source flags, plus `secrets: { gemini: bool, apify: bool, jobsuche: bool }` | Return key material or `.env` contents |
| PUT | `/settings` | Replace non-secret settings | JSON subset of `config.yaml` | Updated settings (same shape as GET, still no raw secrets) | Write `GEMINI_API_KEY` / Apify tokens into YAML |
| PUT | `/settings/secrets/{name}` | Store a named secret | `{"value": "..."}`; `name` is `gemini`, `apify`, or `jobsuche` | `{ "configured": true }` (no value echoed) | Return last-4 or plaintext |
| DELETE | `/settings/secrets/{name}` | Remove a named secret | path `name` | `{ "configured": false }` | Return the old value |
| GET | `/jobs/{id}/letter` | Full letter body | path | `{ body, model, … }` | CV body |
| PUT | `/jobs/{id}/letter` | Save edited letter | `{ body }` | Saved letter | Auto-submit |
| POST | `/jobs/{id}/letter/regenerate` | Force Gemini rewrite | none | New letter body | Include other jobs |
| GET | `/runs/{id}` | Async run status | path | counts, errors, status | Secrets |
| POST | `/runs/{id}/cancel` | Best-effort cancel | path | `{ cancelled }` | Kill Gemini mid-call reliably |
| GET/POST | `/documents` | List / upload Vault docs | multipart on POST | metadata only | CV body in list |
| GET/PATCH/DELETE | `/documents/{id}` | Meta / update / delete | patch fields | metadata | Echo originals in PATCH |
| GET | `/documents/{id}/text` | Extracted text | path | plain text | Meant for engine; UI must not show CV in Memory |
| GET | `/documents/{id}/file` | Download original | path | file bytes | Crawl URLs inside file |
| GET/POST | `/workspace/status` `/workspace/init` | Readiness / ensure native store | none | checklist + data_path | Create Obsidian sync |
| POST | `/workspace/import/obsidian` | One-shot Obsidian import | `{ vault_path }` | import report | Dual-write / live sync |

See also [STORAGE.md](STORAGE.md).

### Security

The API binds to loopback only and guards against cross-site requests and DNS rebinding:

- **Required header:** every `POST`, `PUT`, `PATCH` and `DELETE` must send `X-AppFly: 1`; otherwise `403`. `GET`, `HEAD` and `OPTIONS` (CORS preflight) need no header, and `GET /health` stays open.
- **Origin check:** if a mutating request carries an `Origin` header, it must be on the allow-list; otherwise `403`.
- **Allowed origins (CORS):** `http://localhost:5173` and `http://127.0.0.1:5173` (Vite dev), plus any comma-separated origins in the env var `APPFLY_ALLOWED_ORIGINS` (read at app start, e.g. a packaged-app origin). CORS allows the `Accept`, `Content-Type` and `X-AppFly` headers; no credentials.
- **Allowed hosts:** the `Host` header must be `127.0.0.1` or `localhost` (any port); otherwise `400`.
- Tests use `TestClient(..., base_url="http://127.0.0.1", headers={"X-AppFly": "1"})`.

### Pointing write at a remote gateway

Set `gemini_api_base` in config.yaml (or env `GEMINI_API_BASE`; YAML wins).
Unset = Google default endpoint. Key still comes from Keychain `gemini` then `GEMINI_API_KEY`.
The gateway must speak the Gemini REST API (`google-genai` sends `/{api_version}/models/{model}:generateContent` under the base URL).
`GET /settings` never returns the key material.

### Job list query

`GET /jobs?status=shortlist` filters on vault frontmatter `status`. Omit `status` to return all known notes. Unknown status → `400`.

### Runs

`POST /runs` is asynchronous from the UI's point of view: it must not block the browser on embedding-model download without returning a run id. Errors from scout (including crawl denial) are recorded on the run, not swallowed.

### Settings secrets

`GET /settings` example (illustrative; A1 implements):

```json
{
  "keywords": ["Software Engineer", "Python"],
  "location": "Berlin",
  "letter_cap": 5,
  "sources": { "agentur": true, "inbox": true, "rss": [], "apify": { "enabled": false } },
  "secrets": { "gemini": true, "apify": false, "jobsuche": false }
}
```

`true` means a key is present in the local store, not that it is valid. Never put the key string in this document's examples as a real value, and never return it from GET.
