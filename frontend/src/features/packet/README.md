# Packet

Sealed writer packet for **one** job (desktop 1440).

## Surfaces

- `PacketPage` — `GET /jobs/{source_id}` only (not the whole vault)
- `PacketHeader` — title, company, status, source, match score
- `LetterPanel` — letter excerpt for this job
- `PacketActions` — **Approve** / **Skip** (`PATCH /jobs/{source_id}` with `{ status }`), **Open listing**

## Policy

- Human submits in their own browser. No Easy Apply automation.
- **Open listing** is a normal link. This UI never `fetch()`es listing HTML.
- There is no on-demand listing fetch. Allowed sources are ingested by the scout; when `crawl_allowed` is false, AppFly never fetches the listing's host.

## Data

Falls back to the sample job with the same `source_id` when the API is down. Never sends API keys.
