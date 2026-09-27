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
| POST | `/runs` | Start a full pipeline run (scout → match → write) in the background | none (no request body) | `{ id, status: "queued", started, model }`; `409` while another run is queued/running | Crawl deny-listed hosts; hide `CrawlDeniedError` |
| GET | `/runs` | List runs | none | One row per run id plus legacy day notes (see Runs below) | Include env secrets |
| GET | `/settings` | Read non-secret settings | none | Keywords, location, source flags, plus `secrets: { gemini: bool, apify: bool, jobsuche: bool }` | Return key material or `.env` contents |
| PUT | `/settings` | Replace non-secret settings | JSON subset of `config.yaml` | Updated settings (same shape as GET, still no raw secrets) | Write `GEMINI_API_KEY` / Apify tokens into YAML |
| PUT | `/settings/secrets/{name}` | Store a named secret | `{"value": "..."}`; `name` is `gemini`, `apify`, or `jobsuche` | `{ "configured": true }` (no value echoed) | Return last-4 or plaintext |
| DELETE | `/settings/secrets/{name}` | Remove a named secret | path `name` | `{ "configured": false }` | Return the old value |
| GET | `/jobs/{id}/letter` | Full letter body | path | `{ body, model, … }` | CV body |
| PUT | `/jobs/{id}/letter` | Save edited letter | `{ body }` | Saved letter | Auto-submit |
| POST | `/jobs/{id}/letter/regenerate` | Force Gemini rewrite | none | New letter body | Include other jobs |
| GET | `/runs/{id}` | Run status (memory, then store; survives restart) | path | counts (live while running), errors, status, `interrupted`, `stage`, `write_cap` | Secrets |
| POST | `/runs/{id}/cancel` | Cooperative cancel (checked between stages and letters) | path | `{ cancelled }`; `404` if the run is not in this process | Kill Gemini mid-call |
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

- **No body.** `POST /runs` always runs scout → match → write. Only one run may be `queued` or `running` per server process; a second `POST /runs` returns `409` with the active run id in `detail`. The CLI (`jobhunt run`) and the nightly job call the pipeline directly and are not covered by this lock.
- **Statuses:** `queued` → `running` → `completed` | `completed_with_errors` | `failed` | `cancelled`. `completed`: the pipeline returned with no errors. `completed_with_errors`: it returned normally but recorded errors (a failing letter, a scout source error, a crawl denial). `failed`: the pipeline raised (recorded with `"<ExceptionType>: <message>"` in `errors`) or the run was interrupted. Every transition is written to the store (`runs` table, native backend). Rows stored before this change are not migrated. The CLI still exits 1 when a run has errors.
- **Interrupted:** a stored run left `queued`/`running` by a previous process is reported as `failed` with `interrupted: true` and the legacy `interrupted: …` string in `errors` (kept for older clients). `interrupted` is on `GET /runs/{id}` and every `GET /runs` row (`false` otherwise).
- **Stage and live counts (B1):** while a run is `running`, `stage` is `scout`, `match` or `write` (the stage in progress; it stays put while a cancel is pending) and `null` when queued, finished, or read back from the store. Counts move while the run goes: `scouted` after scout, `shortlisted` / `skipped` after match, `written` / `write_skipped` after each letter attempt (a failed letter leaves `written` unchanged; error strings still arrive when the run ends). Each change is written to the store like a status transition, so a restart keeps the counts reached so far. `write_cap` (`GET /runs/{id}` only) is the configured `letter_cap` for runs started by this server process and `null` for runs read back from the store; it is the cap, not the number of candidates. `stage` and `write_cap` are not stored in the `runs` table (no migration).
- **Cancel** sets a flag the pipeline checks before scout, match and write and before each letter; the run then ends as `cancelled`. A Gemini call already in flight finishes first.
- **`GET /runs`** returns one row per run id (live in-memory state wins over the stored row), newest first. Day notes (`Runs/YYYY-MM-DD.md`) are listed only for days without a stored run. Legacy fields `date`, `path`, `preview`, `has_errors` are unchanged; new fields:

| Field | Meaning |
| --- | --- |
| `id` | Run id (or `YYYY-MM-DD` for a day note) |
| `kind` | `run` or `day_note` |
| `status` | See statuses above (`completed` for day notes) |
| `started_at` / `finished_at` | ISO timestamps (empty when unknown) |
| `counts` | `{ scouted, matched, written }` for runs; `{}` for day notes |
| `error_count` | Number of recorded error strings |
| `interrupted` | `true` when a stored run was settled as stale (status `failed`); `false` otherwise |
| `stage` | B1: `scout` / `match` / `write` while running; `null` otherwise. `counts` values move while running |

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
