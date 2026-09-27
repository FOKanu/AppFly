# Token log (local vs cloud, per task)

One row per task. Grok adds the row when the task's PR is opened.
Use "unknown" when a number is not available. No secrets, hostnames or IPs.

| Date | Task / branch | Local model | Local tokens (if known) | Cloud escalation (y/n) | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-27 | feat/backend-run-visibility (B4) | qwen3-coder:30b (store/API); Cursor for CLI/docs after Aider miss | unknown | y (CLI brief hallucinated) | #38 already merged; store+heartbeat via Aider; CLI/F4/tests by orchestrator |
