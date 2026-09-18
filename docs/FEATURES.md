# Features

Local job-hunt copilot: scout and match on the Mac, Gemini writes letters into a dedicated Obsidian vault, you approve and submit yourself.

## Crawl policy (product rule)

These hosts must never be crawled, RSS-fetched, or sent to Apify. Enforcement lives in `jobhunt.policy` (`DENIED_CRAWL_HOSTS`, `assert_crawl_allowed`). The UI exposes the rule; it does **not** offer scrape buttons.

- linkedin.com
- indeed.com (including de.indeed.com)
- stepstone.de / stepstone.com
- ziprecruiter.com
- xing.com
- glassdoor.com / glassdoor.de
- wellfound.com / angel.co

Allowed ingest: Arbeitsagentur Jobsuche API, RSS on other hosts, `_inbox/` clips the user already opened, and public company career / Impressum pages. Writer packets stay sealed (one job + CV slice). Human approval before submit.

## Frontend chrome (`frontend/`)

Dark calm instrument panel (desktop 1440×900, compact 1280, tablet 768–1023, mobile 390×844). Near-black background, teal status, 32px controls, 7px radius.

| Surface | What it does |
| --- | --- |
| Sidebar / bottom nav | Numbered routes from `frontend/src/app/nav-config.ts` |
| Sticky header | Page title, search ⌘K, heartbeat chip, Run now (R), Pause nightly, Stop |
| Running bar | Persistent Scout → Match → Write pulse |
| System status footer | Local IPC, Ollama, Gemini health, vault path, API origin |
| Heartbeat | Includes `waiting-for-you` (plus running / paused / stopped / idle) |
| Source badges | Agentur API, RSS, Inbox, Apify · Impressum only |

Routes (placeholder bodies — later slices replace them):

1. `/tonight` — Tonight
2. `/queue` — Queue (nav chip shows count only; no table)
3. `/workflow` — Workflow
4. `/memory` — Memory & profiles
5. `/activity` — Activity & logs
6. `/settings` — Settings (no connector key inputs)

`App.tsx` is providers + router only. Chrome lives under `frontend/src/app/layout/`. Shared primitives under `frontend/src/shared/ui/` (one component per file). Typed fetch wrapper: `frontend/src/shared/api/client.ts`. Base URL is `VITE_API_BASE_URL` (default `http://127.0.0.1:8787`). No Gemini / Arbeitsagentur / Apify keys in frontend env or types.

Run controls POST `/v1/run`, `/v1/pause`, `/v1/stop` when the API is up and keep optimistic chrome state when it is not. Heartbeat / status / queue count hydrate from `/v1/heartbeat`, `/v1/status`, `/v1/queue/count`.

### Run the UI

```bash
cd frontend
cp .env.example .env   # optional; default API origin is already loopback :8787
npm install
npm run dev            # http://127.0.0.1:5173
npm run build          # tsc + vite production bundle
```

## Out of scope here

- Queue tables, tonight briefing, packet editor
- Settings key / keychain forms
- Real vault data
- Python scout / match / write
- Computer-use or Easy Apply bots
