# Optional maintainer workflow (multi-agent + local GPU)

**This folder is optional.** It documents a personal/maintainer setup for running AppFly engineering with several AI roles and a remote RTX 5090 coding model.  

Future engineers can ship the product using only:

- [RULES.md](../../RULES.md) / [AGENTS.md](../../AGENTS.md)
- [docs/agents/](../agents/README.md) — Composer / Claude / Iyeke (GrokBot) **product** playbooks

You do **not** need this folder to understand AppFly architecture or to open a normal PR.

| Doc | Purpose |
| --- | --- |
| [MULTI_AGENT.md](MULTI_AGENT.md) | Roles, waves, git branch names, planner → 5090 split |
| [PROMPTS.md](PROMPTS.md) | Kickoff prompts + 5090 brief template |

Product architecture and feature plans stay in `docs/ARCHITECTURE.md`, `FEATURES.md`, `API.md`, `STORAGE.md`, and `docs/agents/{COMPOSER,CLAUDE,GROK}.md (Iyeke)` — do not conflate those with this workflow.
