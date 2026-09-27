# Maintainer workflow (single cloud planner + local 5090 coding)

This folder documents how the maintainer runs AppFly engineering with AI roles:
one cloud planner (Grok) and local coding models on an RTX 5090.

You do **not** need it to understand the AppFly architecture or to open a normal
PR. Product contributors only need:

- [RULES.md](../../RULES.md) / [AGENTS.md](../../AGENTS.md)
- [docs/agents/](../agents/README.md) role playbooks

| Doc | Purpose |
| --- | --- |
| [MULTI_AGENT.md](MULTI_AGENT.md) | Roles, per-task loop, escalation rules, cloud principles, infrastructure |
| [PROMPTS.md](PROMPTS.md) | Kickoff prompts (Grok, local coder, Composer, Claude) + brief template |
| [TOKEN_LOG.md](TOKEN_LOG.md) | Per-task log of local vs cloud usage |
| [ORCHESTRATOR_HANDOFF.md](ORCHESTRATOR_HANDOFF.md) | Live tip / next task when the planner seat changes |
| [briefs/](briefs/) | Ready briefs for the 5090 local coder |

Product architecture and feature plans stay in `docs/ARCHITECTURE.md`,
`FEATURES.md`, `API.md`, `STORAGE.md`, and `docs/agents/*.md`.
