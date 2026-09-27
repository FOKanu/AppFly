# Token log (local vs cloud, per task)

One row per task. Grok adds the row when the task's PR is opened.
Use "unknown" when a number is not available. No secrets, hostnames or IPs.

| Date | Task / branch | Local model | Local tokens (if known) | Cloud escalation (y/n) | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-27 | feat/backend-run-visibility (B4) | qwen3-coder:30b (store/API); Cursor for CLI/docs after Aider miss | unknown | y (CLI brief hallucinated) | #38 already merged; store+heartbeat via Aider; CLI/F4/tests by orchestrator |
| 2026-09-27 | feat/ui-post-b4-reattach | qwen3-coder:30b | unknown | n | Post-B4 UI: drop async: filter; enable Stop for cli/nightly |
| 2026-09-27 | chore/prototype-p7-prep | Cursor (orchestrator) | — | n | FEATURES/AGENTS/handoff tip @ 06fa6d8; UI nightly display 21:00 weekdays |
