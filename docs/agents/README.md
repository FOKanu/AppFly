# Agent playbooks (AppFly product work)

Role briefs for **what to build** on AppFly: owned paths, no-touch lists,
branches, and phased tasks.

Operating model (2026-09-26): one cloud planner (Grok) + local-first coding on
the RTX 5090. See [docs/workflow/MULTI_AGENT.md](../workflow/MULTI_AGENT.md).

| Agent | File | Role |
| --- | --- | --- |
| Grok (Grokbot / Iyeke) | [GROK.md](GROK.md) | Plan, brief ([BRIEF_TEMPLATE.md](BRIEF_TEMPLATE.md)), audit check, diff review, PR text, commits; opens epics |
| Local coder (RTX 5090 models) | [LOCAL_CODER.md](LOCAL_CODER.md) | Audit pass (read-only AUDIT.md) + implementation, tests first, one step per session |
| Composer (Cursor) | [COMPOSER.md](COMPOSER.md) | Gates (local + CI) and merges; smoke tests, desktop packaging (M5), privacy pass (M8) |
| Claude | [CLAUDE.md](CLAUDE.md) | Design review of UI PRs (`VERDICT: APPROVE` / `REQUEST_CHANGES`); UI/UX design calls |

Shared product law:

- [RULES.md](../../RULES.md)
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md), [API.md](../API.md), [STORAGE.md](../STORAGE.md), [FEATURES.md](../FEATURES.md)
- `.cursor/rules/branch-strategy.mdc`, `.cursor/rules/crawl-safety.mdc`

**Open epic and base tip:** see the live tip in [AGENTS.md](../../AGENTS.md) (fetch first). Do **not** start work from stale `main` or from closed `cursor/*` PRs. Composer merges; Cursor may temporarily plan while Grok Bot credits are exhausted (see [ORCHESTRATOR_HANDOFF.md](../workflow/ORCHESTRATOR_HANDOFF.md)).

Hard invariants: crawl deny-list; sealed packets; Keychain-only secrets; no CV
bodies in list UIs; no auto-submit; one concern → one `feat/…` PR.

Workflow details (prompts, brief template, token log): [`docs/workflow/`](../workflow/README.md).
