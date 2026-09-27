# M8 — Privacy / security pass (Composer-owned)

Branch: `feat/privacy-pass-m8` → `integrate/mvp-v1`. Tip base: `fffed5b` (M7).

## Scope

Confirm no secrets in logs/renderer/bundles/app-data; GET never returns CV bodies or
keys; deny-list still enforced. Same Python/JS as the packaged Neutralino shell.

## Findings

| Check | Result | Action |
| --- | --- | --- |
| `GET /settings` secrets | Flags only (`test_api_secrets`, `test_api_settings`) | Pass |
| `GET /documents` list/meta | Metadata only; no body/text fields | Strengthened assertions |
| `GET /documents/{id}/text` | Exists for engine; UI Vault/Memory/CvPicker do not call it | Pass (documented) |
| `GET /jobs` packet | No CV master in response (`test_api_jobs`) | Pass |
| Activity error redact | `redact.ts` strips AIza / sk- / key assignments | Pass |
| Frontend `dist/` secrets | **Fail:** Activity offline mock planted `AIzaSyFake…` in the bundle | **Fixed** — mock uses `[redacted]`; `npm run scan-secrets` |
| `VITE_GEMINI_API_KEY` in bundle | Guard string only (`settingsApi` throws if set) | Acceptable |
| Desktop bootstrap | Logs status only; no keys; `writeToLogFile: false` | Pass |
| Deny-list | `test_policy.py` + scout/apify call `assert_crawl_allowed` | Pass |
| API loopback CORS | Trusted hosts + CSRF; desktop `:5174` allow-listed | Pass |

## Verified commands

```bash
cd backend && python -m pytest tests/test_api_security.py tests/test_policy.py \
  tests/test_api_secrets.py tests/test_api_settings.py tests/test_document_extract.py -q
cd frontend && npm run build:secure   # build + scan-bundle-secrets
```

## Residual / follow-ups

- `documentText()` in `vault/api.ts` is unused (preview deferred). Do not wire into list UIs.
- Download via `GET /documents/{id}/file` is intentional (user-owned originals).
- M8 does not re-audit Keychain OS storage; secrets stay write-only via API.
