# Storage

Local-first data for AppFly. Obsidian is optional (one-shot import), not required.

## Backends

| Mode | Config | Layout |
| --- | --- | --- |
| `native` (default for new installs) | `storage_backend: native` | SQLite + files under the app data dir |
| `markdown` | `storage_backend: markdown` | Existing Obsidian-style vault via `vault.py` |

App data root:

- macOS: `~/Library/Application Support/AppFly/`
- Linux: `~/.local/share/appfly/`

```text
AppFly/
  appfly.sqlite
  files/
    documents/{id}/original[+ext] + extracted.txt
    letters/{source_id}.md
    inbox/{id}.md
  imports/          # Obsidian import reports
```

Secrets stay in the OS Keychain (see `features/secrets/`). Never in SQLite or document bodies returned by list APIs.

## Store interface

Package: `backend/src/jobhunt/store/`.

Protocols: `JobStore`, `LetterStore`, `DocumentStore`, `RunStore`, `RequirementsStore`, composed as `AppStore`.

- **MarkdownVaultStore** — delegates to `Vault` (behavior preserved).
- **SqliteStore** — native SQLite + filesystem blobs.

`get_store(config)` selects the backend. Scout, match, write, and the HTTP API go through the store (or a thin façade), not raw paths.

## Runs table (native, schema v2)

SQLite `runs` rows hold async/CLI pipeline status. B4 columns: `trigger` (`api`|`cli`|`nightly`), `owner`, `heartbeat` (ISO), `cancel_requested`. Cross-process lock uses a fresh heartbeat (≤60 s). Markdown backend does not participate in that lock.

## Documents (Vault UI)

Kinds: `cv`, `voice`, `cert`, `portfolio`, `inbox`, `other`.

- `GET /documents` — metadata only (no bodies, no original bytes).
- `POST /documents` — multipart upload; extract text for cv/voice when possible.
- Active CV / voice flags drive match and write packet slices in-process.
- Never put connector secrets in documents. Size limits apply. Uploaded URLs are not crawled.

## Obsidian

`POST /workspace/import/obsidian` with a vault path: one-shot map of `Jobs/`, `Letters/`, `CV/`, `Requirements.md`, `Runs/` into NativeStore. No dual-write. Live sync is out of scope.

## Privacy

List/metadata APIs never return CV body, `.docx`/PDF bytes, or API keys. The writer still receives one CV text slice in-process inside a sealed packet.
