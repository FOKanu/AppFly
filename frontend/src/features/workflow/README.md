# Workflow (pipeline stepper)

Scout → Match → Write instrument strip. Desktop 1440.

## Surfaces

| Component | Role |
| --- | --- |
| `WorkflowPage` | Loads health, runs and jobs via `useWorkflow`; hosts the panels and banners. |
| `HeartbeatPanel` | Heartbeat steps (`HEARTBEAT_STATES`) for the latest or live run. |
| `SchedulePanel` | Nightly schedule and the caps that bound one run. |
| `SourcesPanel` | Scout sources the nightly run may read; never a deny-listed job board. |
| `RequirementsPanel` | Requirements.md as the matcher and writer read it. |
| `GeminiRateLimitBanner` | Gemini 429 banner (preview fixture only; the API never reports rate_limited). **Run again** uses the shared run controller. |
| `useWorkflow` / `api.ts` | Snapshot loader; `?preview=` fixtures from `mock.ts`. |

Preview: `/workflow?preview=running|failed|rate_limited` (fixtures in `mock.ts`).
