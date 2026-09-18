# Features

Jobhunt Copilot UI. Scout and matching stay local. Gemini writes from a **sealed packet**. You approve here and submit applications yourself.

Deny-listed hosts (LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, Wellfound) may only enter via `_inbox/` clips. The UI never crawls them and never sends them to Apify.

## Queue

Master-detail at `/queue` and `/queue/:sourceId` (desktop 1440).

- List of jobs with **status chips** (`inbox`, `shortlist`, `draft`, `approved`, `applied`, `skipped`)
- **Source badges**: Agentur API, Inbox, RSS, Apify · Impressum only
- **Match scores** from the local matcher (0–100)
- Filters by status and source
- Detail pane for the selected job only
- **Open listing** is a human link; **Open packet** goes to the sealed writer packet
- If `crawl_allowed` is false, crawl / fetch listing is not offered

Data: `GET /jobs`. `PATCH /jobs/{source_id}` is used on the packet. Sample data is used when the API is down. No API keys in the browser.

## Packet

Sealed writer packet at `/packet/:sourceId` (desktop 1440).

- One job + letter excerpt — not the CV, voice samples, or the rest of the vault
- Actions: **Approve** → `status: approved`, **Skip** → `status: skipped`
- **Open listing** is OK (you click it)
- Do **not** automate apply
- Do **not** fetch deny-listed listing HTML
- **Fetch listing** is hidden when `crawl_allowed` is false; when shown it POSTs to the local scout, never to the listing URL

## Out of scope here

Tonight, Settings keys, the Python engine, and Easy Apply.
