# Features

Status of copilot surfaces. UI rows are frontend-only until the local API lands.

| Feature | Status | Notes |
| --- | --- | --- |
| Tonight (home dashboard) | UI ready | Last run summary, drafts waiting-for-you, source mix (API · RSS · clips), pipeline snapshot. Empty / running / failed states. Data via `GET /health`, `GET /runs`, `GET /jobs?status=draft` (+ shortlist). Mock fallback when API is down. |
| Workflow (pipeline stepper) | UI ready | Scout → Match → Write. Queued behind Match. Gemini rate-limit banner with Retry Gemini (`POST /write` only — no scrape). Empty / running / failed (“Run failed, API down”). |
| Queue master-detail | Out of scope here | Separate owner. |
| Settings / secrets | Out of scope here | Keys stay off the UI. |
| Mobile polish | Out of scope here | A8. |
