# Queue

Master-detail job queue for Jobhunt Copilot (desktop 1440).

## Surfaces

- `QueuePage` — GET `/jobs`, filters, list + selected job pane
- `states/EmptyQueueState` — empty vault/queue canvas (allowed ingest only)
- `JobList` / `JobRow` — status chips, source badges, match scores
- `QueueFilters` — status (`inbox` … `skipped`) and source
- `StatusChip` — pipeline status
- Source badges: **Agentur API**, **Inbox**, **RSS**, **Apify · Impressum only**

## Data

- `GET /jobs`, `GET /jobs/{source_id}`, `PATCH /jobs/{source_id}` with `{ status }`
- No API keys in the browser
- Mock sample queue when the local API is down

## Policy

- `Open listing` is a human link. This UI never fetches listing HTML.
- The detail pane never offers an on-demand listing fetch. Allowed sources are ingested by the scout.

Selecting a job updates `/queue/:sourceId`. **Open packet** goes to the sealed writer packet for that one job.
