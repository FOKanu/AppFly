# Features

Jobhunt Copilot writes into a dedicated Obsidian vault. Scout and matching stay on the Mac. Gemini writes cover letters from a sealed packet. You approve in Obsidian and submit applications yourself.

This repo does **not** crawl LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, or Wellfound — including via Apify. Enforcement: `jobhunt.policy`.

## Settings & connectivity (Phase 1)

Route: `/settings` (`frontend/src/features/settings`). Desktop 1440 and stacked mobile.

| Panel | Behavior |
| --- | --- |
| Obsidian vault | Path text field, Browse, placeholder stats (notes / last scout / match / write) |
| Connectivity | Local IPC online/offline from `GET /settings`. Remote Bridge API shows **not configured** / **offline**. URL field is visible; **Connect is disabled** (no bridge server in Phase 1) |
| API & model health | Gemini Flash, Ollama, Arbeitsagentur, Apify, MiniLM — status only |
| API keys | `GEMINI_API_KEY` and `APIFY_TOKEN` |

### Write-only connector keys

- Inputs are `type="password"` with `autocomplete="off"`.
- `PUT /settings/secrets/{name}` body: `{ "value": "…" }`. Rotate overwrites.
- After save the field is **cleared**. A page refresh never shows the key.
- UI badge is **configured** or **missing** only. No last-4. No echo of GET payloads.
- If `GET /settings` ever returns a secret string, the frontend treats it as a bug and **does not display it**.
- Caption: *Keys never leave this machine in Phase 1.*
- Frontend env: `VITE_API_BASE_URL` only. Never `VITE_GEMINI_API_KEY`.

Keychain storage is a backend concern (not this UI). Remote Bridge, crawl, and Queue are out of scope here.

## Ingest & write (CLI)

1. **Scout** — Arbeitsagentur Jobsuche API, optional RSS, `_inbox/` Web Clipper notes (local parse only).
2. **Match** — `Requirements.md` filters plus local MiniLM embeddings.
3. **Write** — Gemini Flash, up to five sealed packets (one job + CV slice).
4. **Home.md** — shortlist / draft / approved table.

Submit stays human-in-the-browser. No Easy Apply bots.
