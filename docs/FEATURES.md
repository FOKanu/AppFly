# Features

Junior map of what this copilot does. Each bullet is a folder or module you can open.

## Scout, match, write

- **Scout** (`jobhunt/scout/`) — Arbeitsagentur Jobsuche API, optional RSS, and `_inbox/` Web Clipper notes the user already opened. Never crawls LinkedIn / Indeed / Stepstone / ZipRecruiter / Xing / Glassdoor (see `jobhunt.policy`).
- **Match** (`jobhunt/match.py`) — hard filters from `Requirements.md` plus a local embedding score.
- **Write** (`jobhunt/write.py`) — Gemini writes up to five letters from a sealed packet (one job + CV slice). Human approval in Obsidian before submit.
- **Vault** (`jobhunt/vault.py`) — Obsidian notes. Secrets must never be written here, including `Home.md`.

## Connector secrets (write-only)

Folder: `src/jobhunt/features/secrets/` (README there too).

Settings can **save** Gemini and Apify keys. HTTP **cannot read them back**.

| Function | For | Returns |
| --- | --- | --- |
| `save_secret(name, value)` | Settings PUT / rotate | nothing (overwrite is rotation) |
| `delete_secret(name)` | Settings DELETE | nothing (unset; missing is OK) |
| `is_configured(name)` | GET `/settings` flags | `bool` only |
| `get_for_runtime(name)` | in-process engine (`write.py`, Apify) | `str \| None` — **never** put this on the wire |

Storage:

1. macOS Keychain, service `appfly.jobhunt` (via `keyring`).
2. If Keychain is missing (CI/Linux): gitignored `.secrets/` files (mode 0600).
3. Tests: `MemoryKeychain` mock — no OS, no files.

Names: `gemini`, `apify`, `jobsuche`. Env fallbacks: `GEMINI_API_KEY`, `APIFY_TOKEN`, `JOBSUCHE_API_KEY`. Jobsuche’s public default `jobboerse-jobsuche` is **not** “configured custom”; that flag is true only after the user saves an override.

`AppConfig.gemini_api_key` / `apify_token` prefer `get_for_runtime`, then env. The writer keeps working from `.env` if Settings was never used.

## HTTP

See [API.md](API.md). No React pages live in this feature.

## Crawl safety

Denied hosts are listed in `jobhunt.policy.DENIED_CRAWL_HOSTS`. Apify may only fetch public pages that pass `assert_crawl_allowed`. Inbox clips parse the **local file**; they must not HTTP-GET a deny-listed listing URL.
