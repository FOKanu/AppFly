# Architecture

Jobhunt Copilot is a **local-first** job assistant. The human submits applications. Python owns ingest, matching, letters, and the vault. The UI is a dark instrument panel that will talk to a local HTTP API.

## Layers

```
frontend/          React UI (Vite). Feature folders under src/features/
    └── HTTP       127.0.0.1:8787  — never puts secret values in GET bodies
desktop/           Neutralino shell (M5). Serves built UI; spawns uvicorn on loopback
backend/          Python package `jobhunt`
    cli.py         `jobhunt init|scout|match|write|run`
    api/           FastAPI (jobs, runs, settings, secrets, documents, workspace)
    store/         AppStore protocol — SqliteStore (native) or MarkdownVaultStore
    policy.py      Canonical crawl deny-list (DENIED_CRAWL_HOSTS)
    config.py      Repo-root config.yaml, .env, vault-templates, .cache
    models.py      Job, Requirements
    vault.py       Obsidian markdown I/O (markdown backend + import source)
    features/      One capability per folder
        scout/     agentur, rss, inbox, apify, collect_jobs
        match/     hard filters + local embeddings
        write/     sealed packet → Gemini letter
        secrets/   write-only Keychain
vault-templates/   Copied into markdown vaults / used on import (repo root)
```

Storage epic: [STORAGE.md](STORAGE.md). Shared code (config, models, vault, store, policy, runlog, CLI) stays under `backend/src/jobhunt/`, not inside a feature folder. Do not merge scout, match, and write into one module.

## How to add a feature

1. Create a new folder: `backend/src/jobhunt/features/<name>/` and/or `frontend/src/features/<name>/`.
2. Put a one-paragraph `README.md` in that folder stating purpose and what it must not do.
3. Add a row to [FEATURES.md](FEATURES.md).
4. Add tests (`backend/tests/` today; frontend tests when a screen exists).
5. Export a small public API from the folder `__init__.py`. One responsibility per file.
6. Every new module and exported function/class gets a purpose docstring (Purpose, Inputs, Returns, Does not).

Do not implement a feature by editing an unrelated file. Do not crawl deny-listed hosts from a new adapter — call `assert_crawl_allowed` first.

## Data flow: CLI vs UI

**CLI (today, behavior unchanged):**

`jobhunt scout` → `features.scout.collect_jobs` → `Vault.upsert_job`  
`jobhunt match` → `features.match.match_jobs` → status/score on notes  
`jobhunt write` → `features.write.write_letters` → `Letters/` + status `draft`  
`jobhunt run` → all three, then `Runs/YYYY-MM-DD.md` and `Home.md`

Config and `.env` are read from the **git repository root**, even though the package lives in `backend/`. Native installs use SQLite under the OS app-data dir; markdown mode still uses an Obsidian-compatible folder (default `~/Documents/Job Search`).

**UI:**

Browser → `VITE_API_BASE_URL` (default `http://127.0.0.1:8787`) → FastAPI → `get_store(config)`. Routes: [API.md](API.md). The UI must not fetch listing URLs itself, especially deny-listed hosts. Vault (`/vault`) is the in-app document library; Obsidian is optional import only.

**Desktop shell (M5):**

[desktop/](../desktop/) uses **Neutralino** (chosen over Tauri for MVP: smaller toolchain, no Rust). The window serves the Vite production build from `desktop/resources/` on fixed port **5174**. On launch, `resources/js/bootstrap.js` probes `GET /health` and, if needed, spawns `python -m jobhunt.api` from the repo checkout (`backend/.venv` or `uv run`) on `127.0.0.1:8787`. Native data stays under Application Support / XDG (`native_data_dir`). Secrets stay in Keychain via the API; no keys in the renderer or `VITE_*`. See [desktop/README.md](../desktop/README.md).

**Privacy (M8):** Production UI bundles are scanned for secret-shaped tokens (`frontend` `npm run scan-secrets`, also after `desktop` `prepare-resources`). GET list endpoints return metadata / presence flags only. Crawl deny-list remains enforced in the same process the shell spawns. Audit notes: [briefs/M8-privacy-pass.md](workflow/briefs/M8-privacy-pass.md).

## Crawl policy

Canonical list: `backend/src/jobhunt/policy.py` (`DENIED_CRAWL_HOSTS` / `DENIED_ROOT_DOMAINS`).

Never HTTP-fetch, RSS-fetch, or send to Apify: LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, Wellfound, AngelList. Inbox may **store** those URLs in a clip the user already opened; scout parses the **local file only**.

If a start URL is denied, **fail the run**. Do not skip it and crawl anyway.

## Import paths after A0

Preferred layout is already in place:

- `jobhunt.features.scout` (package: `collect_jobs`, `agentur`, `rss`, `inbox`, `apify`)
- `jobhunt.features.match`
- `jobhunt.features.write`

There is no leftover `jobhunt.scout` shim. Next step if imports get awkward: add thin re-export modules at the old names — do not copy logic back out of `features/`.
