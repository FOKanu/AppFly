# Features

## Local HTTP API (this change)

A loopback FastAPI server so a future frontend can drive the **existing** engine:

- Health check
- Job queue (list / packet / status patch) via `Vault`
- Pipeline run (`jobhunt run` extracted to `jobhunt.features.pipeline.run_all`)
- Settings read/write on `config.yaml`
- Secret **presence** flags (env only); secret PUT/DELETE are stubs

It does **not** include the React app, macOS Keychain, Apify actor enabling, or Easy Apply.

Layout today: `src/jobhunt/api/` (A0 will likely move the package under `backend/`).

See [API.md](API.md) for endpoints.

## Engine (unchanged)

Scout (Agentur API, RSS, `_inbox/` clips), local match, Gemini writer packets (one job + CV slice), Obsidian vault. Deny-listed hosts are never crawled; enforcement stays in `jobhunt.policy`.
