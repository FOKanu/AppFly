# AppFly desktop shell (M5)

Neutralino window that loads the built Vite UI and spawns the loopback FastAPI
(`127.0.0.1:8787`) from the repo checkout.

## Choice

**Neutralino** (not Tauri) for MVP: small binary, no Rust toolchain, enough
`os.spawnProcess` to start uvicorn. Documented in [ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Prerequisites

- Node 22 (frontend build; see the repo `.nvmrc`)
- Python backend install: `backend/.venv` with `pip install -e "./backend[dev,extract]"`, or `uv` on `PATH`
- `config.yaml` at the repo root (`jobhunt init` once)

## Commands

```bash
cd desktop
npm install
npm run update              # downloads Neutralino binaries + client (gitignored)
npm run prepare-resources   # vite build → resources/ + inject bootstrap + secret scan
npm run dev                 # prepare + neu run
npm run build               # prepare + neu build → dist/
npm run smoke               # import check for the API spawn path
```

CI runs `npm run prepare-resources` in a `desktop` job (frontend + desktop `npm ci`, Node 22), so a broken UI build or a secret-shaped token in the bundle fails the PR.

The shell UI origin is fixed at **`http://127.0.0.1:5174`** (and localhost).
That pair is on the API CORS allow-list; bootstrap also sets
`APPFLY_ALLOWED_ORIGINS` when it starts the API.

## Behaviour

1. Window loads `/resources/index.html` (built UI).
2. `bootstrap.js` calls `Neutralino.init()`, then `GET /health`.
3. If the API is down, spawn `backend/.venv/bin/python -m jobhunt.api` (else `uv run`).
4. On window close, stop only an API process this shell started.

Secrets stay in Keychain via the API. No `VITE_GEMINI_API_KEY`. The UI still
talks to `http://127.0.0.1:8787` only.

## Status and open items

- First-launch wizard: landed (M6, #58).
- Bundle secret scan: landed (M8, #60); `prepare-resources` runs it on `desktop/.ui-dist`.
- Still open: a self-contained build. `neu build` output still expects a repo checkout with `backend/.venv`
  (or `uv`) to spawn the API. A PyInstaller / bundled Python sidecar and an audit of packaged paths wait on that
  packaging decision.
