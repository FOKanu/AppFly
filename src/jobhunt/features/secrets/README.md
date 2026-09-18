# Connector secrets

Write-only storage for Gemini, Apify, and an optional Jobsuche override.

## Why this exists

The Settings UI needs to **save** API keys. It must never **read them back**.
GET `/settings` only returns booleans (`gemini`, `apify`, `jobsuche`). The
cover-letter writer (`write.py`) still needs the Gemini key in-process.

## What goes where

| Place | Allowed? |
| --- | --- |
| macOS Keychain (service `appfly.jobhunt`) | yes |
| gitignored `.secrets/` on Linux/CI | yes |
| process memory via `get_for_runtime` | yes (engine only) |
| HTTP GET / Settings UI | **no** (booleans only) |
| Obsidian vault, `Home.md`, git, frontend bundles | **never** |

## Files

- `names.py` — `SecretName` enum (`gemini`, `apify`, `jobsuche`)
- `keychain.py` — Keychain adapter (`MacOSKeychain`, `FileKeychain`, `MemoryKeychain`)
- `store.py` — `save`, `delete`, `is_configured`, `get_for_runtime`

## Runtime lookup

`AppConfig.gemini_api_key` / `apify_token` call `get_for_runtime` first, then
the matching env var (`GEMINI_API_KEY`, `APIFY_TOKEN`). Jobsuche uses a saved
override if present, else `JOBSUCHE_API_KEY`, else the public default
`jobboerse-jobsuche`. That public default is **not** “configured custom”.

## HTTP

- `PUT /settings/secrets/{name}` with `{"value": "..."}` → `{"configured": true}`
- `DELETE /settings/secrets/{name}` → `{"configured": false}`
- `GET /settings` → `{gemini: bool, apify: bool, jobsuche: bool}`
- Unknown `{name}` → **400**
- There is **no** GET of the secret itself (no last-4, no plaintext)

Rotate = PUT again (overwrite). Tests mock the Keychain with `MemoryKeychain`.
