# Agent playbooks (AppFly product work)

Role briefs for **what to build** on AppFly: owned paths, no-touch lists,
branches, and phased tasks.

Operating model (2026-09-26): one cloud planner (Grok) + local-first coding on
the RTX 5090. See [docs/workflow/MULTI_AGENT.md](../workflow/MULTI_AGENT.md).

| Agent | File | Role |
| --- | --- | --- |
| Grok (Grokbot / Iyeke) | [GROK.md](GROK.md) | Single cloud planner and orchestrator (backend + frontend); opens epics; briefs, review, PR text; backend engine owner |
| Local coder (RTX 5090 models) | [LOCAL_CODER.md](LOCAL_CODER.md) | All mechanical work from Grok's briefs: code, tests, docstrings, summaries, PR drafts |
| Composer (Cursor) | [COMPOSER.md](COMPOSER.md) | Merge and CI gate, smoke tests, desktop packaging (M5), privacy pass (M8) |
| Claude | [CLAUDE.md](CLAUDE.md) | On call for UI/UX design decisions and UI review when Grok asks |

Shared product law:

- [RULES.md](../../RULES.md)
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md), [API.md](../API.md), [STORAGE.md](../STORAGE.md), [FEATURES.md](../FEATURES.md)
- `.cursor/rules/branch-strategy.mdc`, `.cursor/rules/crawl-safety.mdc`

**Ship tip:** `origin/main` (ui-v1 + storage-v1 landed).
**Open epic:** `integrate/prototype-v1` — all work PRs into that branch, not stale `main`. Grok owns the epic lifecycle; Composer merges.

Hard invariants: crawl deny-list; sealed packets; Keychain-only secrets; no CV
bodies in list UIs; no auto-submit; one concern → one `feat/…` PR.

Workflow details (prompts, brief template, token log): [`docs/workflow/`](../workflow/README.md).
