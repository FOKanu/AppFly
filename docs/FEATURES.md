# Features

Jobhunt Copilot writes sealed cover-letter packets into a local Obsidian vault. The human still submits every application in the browser. LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, and Wellfound are never crawled or sent to Apify.

## Pipeline (unchanged)

1. **Scout** — Arbeitsagentur Jobsuche API, optional RSS (non-denied hosts), `_inbox/` Web Clipper notes already opened by the user.
2. **Match** — hard filters from `Requirements.md` plus a local embedding model.
3. **Write** — Gemini Flash, at most five letters per run, one job + CV slice per packet.
4. **Home.md** — regenerated table of `shortlist` / `draft` / `approved` jobs.

There is no Easy Apply bot, no job-board session upload, and no remote apply.

## Frontend shell (this drop)

`frontend/` is a minimal Vite + React app. Other agents own desktop page files; this drop adds layout and edge-state UI only.

### FigJam 04 Mobile (390)

- Single column (`MobileShell`)
- Bottom nav: **Tonight**, **Queue**, **Workflow**, **Activity**, **More**
- **More** sheet: Memory, Activity, Settings
- Settings rows: vault path, connectivity, API keys (write-only copy — keys are never echoed)

### FigJam 03 Tablet (768)

- Same destinations on a left icon rail (`TabletShell`)
- Two-pane main + policy aside when width allows
- More opens as a flyout panel instead of a full-width sheet
- Widths ≥1024 reuse the tablet shell so desktop pages are not rewritten

Breakpoint helper: `frontend/src/shared/useBreakpoint.ts` (`mobile` &lt; 768 ≤ `tablet` &lt; 1024 ≤ `desktop`). Prefer CSS; call the hook sparingly.

### FigJam 05 States

| State | File |
| --- | --- |
| Offline / Local IPC disconnected / Remote Bridge disconnected | `frontend/src/shared/ui/OfflineBanner.tsx` |
| Generic banner / empty canvas | `Banner.tsx`, `EmptyState.tsx` |
| Empty queue | `frontend/src/features/queue/states/EmptyQueueState.tsx` |
| Run failed | `frontend/src/features/workflow/states/RunFailedState.tsx` |
| Gemini rate-limited | `frontend/src/features/write/states/GeminiRateLimitedState.tsx` |

Until a local API exists, IPC and Remote Bridge default to **disconnected** so the banners are visible and honest. Browser offline uses `navigator.onLine`.

Preview fixtures (dev/demo only): `?state=empty-queue`, `?state=run-failed`, `?state=rate-limited`.

## Run the UI

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build
npm test
```

Resize to 390px and 768px (or DevTools device mode) to check the two shells.
