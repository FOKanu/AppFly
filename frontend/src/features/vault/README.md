# Vault

The files AppFly owns. Native storage — no Obsidian required.

This is the *file* surface. Its two neighbours are deliberately separate:

| Surface | Holds |
| --- | --- |
| **Vault** (`/vault`) | the files themselves — upload, rename, set active, download, delete |
| **Profiles** (`/profiles`) | which of those files a preset hands to the writer |
| **Memory** (`/memory`) | application and version history — never a file browser |

## Never render a body

`GET /documents` is metadata only by contract — id, kind, label, mime,
word_count, `active_cv`/`active_voice`, timestamps. There is no body field, so
the table cannot leak a CV.

Field names and kinds mirror `DocumentOut` in
`backend/src/jobhunt/api/routes/documents.py` and `DocumentKind` in
`backend/src/jobhunt/store/types.py`:
`cv | voice | cert | portfolio | inbox | other`, with the active CV and the
active voice sample tracked as **two separate flags**.

`DocumentOut` does not carry a byte size, so the Size column shows an em dash
until the store reports one.

`documentText(id)` exists in `api.ts` for a future preview pane and is **not
called from any list view**. Keeping it out of the table, Memory and Profiles
is what enforces "no CV markdown in a list".

## Endpoints, and what happens without them

| Call | Used by |
| --- | --- |
| `GET /documents` | the table, Profiles' picker, the Settings checklist |
| `POST /documents` | the upload zone (multipart, so bytes never enter React) |
| `PATCH /documents/{id}` | rename and set-active |
| `DELETE /documents/{id}` | delete |
| `GET /documents/{id}/file` | the download link, opened by the browser |
| `GET /workspace`, `POST /workspace/init` | the Settings app-data panel |
| `POST /workspace/import/obsidian` | the optional one-time import |

A **404 is treated as "not built yet"**: the list falls back to sample
metadata, a banner says so, and every write control is disabled with the
reason on hover. Any other error surfaces as a real failure. Nothing silently
no-ops.

## Obsidian

Import only, in Settings, styled as secondary and labelled optional. It is a
one-way copy into AppFly's storage, not a sync, and AppFly never writes back.
