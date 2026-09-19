# Profiles

Who you hunt as. Split out of Memory so the editor and the ledger are separate
surfaces: **Profiles edits, Memory remembers.**

Reached from the sidebar PROFILE dropdown (`app/layout/ProfileMenu.tsx`), not
from the numbered nav.

## What actually saves

`api.ts` exports `CAPABILITIES`, the single source of truth for what the local
API can persist. It mirrors `SettingsUpdate` in the backend schema:

| Field | Persists | Via |
| --- | --- | --- |
| Role titles | yes | `PUT /settings` → `keywords` |
| Location | yes | `PUT /settings` → `location` |
| Arbeitsagentur / `_inbox` toggles | yes | `PUT /settings` → `sources` |
| RSS feeds, Apify, start URLs | no | read-only from `config.yaml` |
| Seniority, work mode, salary floor | no | no backend field |
| Skip companies, banned terms | no | no backend field |
| More than one profile | no | needs a `/profiles` endpoint |

Controls in the "no" rows are rendered **disabled with the reason as their
title**, never as live inputs that silently drop the edit.

Never render CV or letter bodies here — `ProfileDocuments` shows paths,
presence and counts only.
