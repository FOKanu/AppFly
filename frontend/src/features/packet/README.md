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
- **Fetch listing** is shown only when `crawl_allowed` is true, and it POSTs to the local API — never to LinkedIn / Indeed / Stepstone / ZipRecruiter / Xing / Glassdoor.

## Data

Falls back to the sample job with the same `source_id` when the API is down. Never sends API keys.
