# Tonight (home dashboard)

Instrument-panel home for last night's copilot run. Desktop 1440.

## Surfaces

| Component | Role |
| --- | --- |
| `TonightPage` | Loads `GET /health`, `/runs`, `/jobs?status=draft` (and shortlist). Switches empty / running / failed. |
| `RunSummary` | Last run window, scouted / shortlisted / written counts. |
| `DraftsWaiting` | Letters waiting for human review (`status=draft`). |
| `SourceMix` | Ingest mix: **API · RSS · clips**. |
| `PipelineSnapshot` | Compact Scout → Match → Write lights. |
| `TonightEmpty` | No run yet. |
| `TonightRunning` | Pipeline in flight. |
| `TonightFailed` | **Run failed, API down**. |

## Data

Client lives in `api.ts`. If the backend is missing, fixtures in `mock.ts` render the panel. Job listing URLs are display-only — never fetched from the UI.

Preview: `/?preview=empty|running|failed`.
