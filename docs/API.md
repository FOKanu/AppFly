# Local HTTP API

Localhost only. Connector secrets are **write-only**: the UI can save a key and see a boolean, never the key itself (no plaintext, no last-4).

Run:

```bash
jobhunt serve
# or: uvicorn jobhunt.api.app:app --host 127.0.0.1 --port 8745
```

Default bind is `127.0.0.1:8745`.

## `GET /settings`

Status flags for the Settings UI. **Does not** call `get_for_runtime` and **must not** include secret values.

```json
{
  "gemini": false,
  "apify": false,
  "jobsuche": false
}
```

`jobsuche` is true only when the user saved an override. The public Arbeitsagentur client id `jobboerse-jobsuche` does not count as configured.

## `PUT /settings/secrets/{name}`

`{name}` is one of `gemini`, `apify`, `jobsuche`.

Request:

```json
{ "value": "the-api-key" }
```

Response:

```json
{ "configured": true }
```

Rotate = PUT again (overwrite). Empty / whitespace-only values are **400**. Unknown `{name}` is **400**. The response never echoes `value`.

## `DELETE /settings/secrets/{name}`

Unsets the key (idempotent).

```json
{ "configured": false }
```

Unknown `{name}` is **400**. There is **no** `GET /settings/secrets/{name}`.

## Engine vs HTTP

| Caller | How it gets a Gemini key |
| --- | --- |
| `write.py` | `config.gemini_api_key` → store `get_for_runtime` then `GEMINI_API_KEY` |
| GET `/settings` | `is_configured` → boolean only |

Never log the PUT body. Never write keys into the Obsidian vault, `Home.md`, git, or frontend bundles.

## Errors

| Status | When |
| --- | --- |
| 400 | Unknown secret name, or empty value |
| 422 | Missing JSON / missing `value` field (FastAPI validation) |
| 405 | `GET /settings/secrets/{name}` (not implemented on purpose) |
