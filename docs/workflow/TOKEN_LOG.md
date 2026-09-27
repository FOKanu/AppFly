# Token log (local vs cloud, per task)

One row per task. Grok (or the temp orchestrator) adds the row when the task's PR is opened.
Use "unknown" when a number is not available. No secrets, hostnames or IPs.

**Mode column:** `default` = current mixed split; `optimized` = local-heavy (~75%
implementation). Add `(token-limit fallback)` in Notes when cloud switched because
tokens / credits were nearly exhausted. See [MULTI_AGENT.md §1a](MULTI_AGENT.md).

| Date | Task / branch | Mode | Local model | Local tokens (if known) | Cloud escalation (y/n) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-27 | feat/backend-cache-appdata (M4) | default | qwen3-coder:30b (cache_dir only) | ~13k sent | y (partial apply) | Aider applied config only; cloud finished migrate/layout/tests/docs |
| 2026-09-27 | feat/backend-run-cv (M2) | default | qwen3-coder:30b (try1+try2 failed) | ~27k sent / 21k recv try1; try2 runaway n_gen>50k | y | 9-file `diff` → 0 applies; `whole` runaway killed; Composer shipped #52. Drove LOCAL_BULK_LESSONS + local-coder-bulk rule |
| 2026-09-27 | feat/backend-run-visibility (B4) | default | qwen3-coder:30b (store/API); Cursor for CLI/docs after Aider miss | unknown | y (CLI brief hallucinated) | #38 already merged; store+heartbeat via Aider; CLI/F4/tests by orchestrator |
| 2026-09-27 | feat/ui-post-b4-reattach | default | qwen3-coder:30b | unknown | n | Post-B4 UI: drop async: filter; enable Stop for cli/nightly |
| 2026-09-27 | chore/prototype-p7-prep | default | Cursor (orchestrator) | — | n | FEATURES/AGENTS/handoff tip @ 06fa6d8; UI nightly display 21:00 weekdays |
| 2026-09-27 | chore/docs-open-mvp-v1 | default | Cursor (orchestrator) | — | n | Open mvp-v1 @ ff61b86; close prototype on main (#48) |
