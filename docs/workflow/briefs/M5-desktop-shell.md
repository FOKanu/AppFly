# M5 — Desktop shell (Composer-owned)

Status: **landed** on `main` via mvp-v1 (#57, #61). The `prepare-resources` path bug (from M8 #60) was fixed in #63 (gaps-v1). Manual smoke below is still open.

## Decision

**Neutralino 6.9** over Tauri for MVP: no Rust toolchain, small binary, `os.spawnProcess` is enough to start uvicorn from the checkout.

## Acceptance

- [x] `desktop/` with `neutralino.config.json`, bootstrap, prepare script, README
- [x] Built UI served in the Neutralino window (port **5174**)
- [x] Bootstrap starts `python -m jobhunt.api` on `127.0.0.1:8787` when `/health` is down
- [x] CORS defaults include `http://127.0.0.1:5174` / `http://localhost:5174`
- [x] Reuses native app-data paths (no new store root)
- [x] No secrets / `VITE_GEMINI_API_KEY` in the shell
- [ ] Manual smoke: `cd desktop && npm run update && npm run dev` → UI + API (still open: user check on the Mac)

## Out of scope

- PyInstaller sidecar (venv/`uv` from checkout)
- M6 first-launch wizard
- M8 privacy audit of `neu build` artifacts
