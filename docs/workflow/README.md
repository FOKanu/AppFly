# Maintainer workflow (single cloud planner + local 5090 coding)

This folder documents how the maintainer runs AppFly engineering with AI roles:
one cloud planner (Grok) and local coding models on an RTX 5090.

You do **not** need it to understand the AppFly architecture or to open a normal
PR. Product contributors only need:

- [RULES.md](../../RULES.md) / [AGENTS.md](../../AGENTS.md)
- [docs/agents/](../agents/README.md) role playbooks

| Doc | Purpose |
| --- | --- |
| [MULTI_AGENT.md](MULTI_AGENT.md) | Roles, per-task loop, compute modes, **§4a local bulk slices + cloud check-ins**, escalation, infrastructure |
| [LOCAL_BULK_LESSONS.md](LOCAL_BULK_LESSONS.md) | M2 evidence: why 9-file Aider packages fail; slice pattern |
| [PROMPTS.md](PROMPTS.md) | Kickoff prompts (Grok, local coder, Composer, Claude) + brief template (CHECK-IN AFTER) |
| [TOKEN_LOG.md](TOKEN_LOG.md) | Per-task log of local vs cloud usage (note `default` / `optimized` mode) |
| [ORCHESTRATOR_HANDOFF.md](ORCHESTRATOR_HANDOFF.md) | Live tip / next task when the planner seat changes |
| [briefs/](briefs/) | Ready briefs for the 5090 local coder |
| [MVP_SEQUENCE.md](MVP_SEQUENCE.md) | M1–M8 order, deps, and when to call Claude (after prototype → main) |

**Local bulk:** Cursor always-apply rule [`.cursor/rules/local-coder-bulk.mdc`](../../.cursor/rules/local-coder-bulk.mdc).
Do not one-shot large multi-file Aider packages under default split; check in with cloud between slices.

**Compute modes:** **Default** = current mixed split (cloud may implement). **Optimized**
(~75% local implementation) = optional user choice, and the fallback when cloud
agents are about to hit token / credit limits. Details: [MULTI_AGENT.md §1a](MULTI_AGENT.md).

Product architecture and feature plans stay in `docs/ARCHITECTURE.md`,
`FEATURES.md`, `API.md`, `STORAGE.md`, and `docs/agents/*.md`.
