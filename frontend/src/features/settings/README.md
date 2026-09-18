# Settings & connectivity

Frontend ownership for this screen. One React component per file. Purpose JSDoc on every export.

| File | Role |
| --- | --- |
| `SettingsPage.tsx` | Page: vault, connectivity, health, keys |
| `VaultPanel.tsx` | Obsidian path, Browse, stats placeholders |
| `ConnectivityPanel.tsx` | Local IPC status; Remote Bridge stub |
| `ApiHealthPanel.tsx` | Gemini Flash, Ollama, Arbeitsagentur, Apify, MiniLM |
| `ConnectorKeyField.tsx` | Write-only password field. **Never renders stored secrets.** |
| `ApiKeysPanel.tsx` | `GEMINI_API_KEY` and `APIFY_TOKEN` |

## Secret contract

- `GET /settings` — boolean `configured` flags only. If a GET ever returns a key string, treat it as a bug and ignore it (do not display, do not keep in React state).
- `PUT /settings/secrets/{name}` with `{ value }`. Rotate = overwrite.
- After save the input is **empty**. Refresh still shows only `configured` / `missing`. No last-4.
- `type="password"`, `autocomplete="off"`. Never `console.log` values.
- Config: `VITE_API_BASE_URL` only. Never `VITE_GEMINI_API_KEY`.
- Caption: *Keys never leave this machine in Phase 1.*

## Out of scope

Keychain backend, Remote Bridge server, crawl, Queue.
