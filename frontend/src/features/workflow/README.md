# Workflow (pipeline stepper)

Scout → Match → Write instrument strip. Desktop 1440.

## Surfaces

| Component | Role |
| --- | --- |
| `WorkflowPage` | Loads health + runs + shortlist/inbox jobs. Hosts stepper and banners. |
| `PipelineStepper` | Stage lights and connectors. |
| `StageCard` | One stage: counts, status, detail. |
| `QueuedBehindMatch` | Jobs still in inbox / waiting on Match. |
| `GeminiRateLimitBanner` | Gemini 429. **Retry Gemini** posts to `/write` — no scraping. |
| `states/GeminiRateLimitedState` | FigJam empty canvas for the rate-limit preview. |
| `WorkflowEmpty` | No pipeline activity. |
| `WorkflowRunning` | Live run. |
| `WorkflowFailed` | `states/RunFailedState` — run failed; human still submits. |

Preview: `/workflow?preview=empty|running|failed|rate_limited`.
