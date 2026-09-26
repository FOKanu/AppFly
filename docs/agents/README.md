# Agent playbooks (AppFly product work)

Role-specific briefs for **what to build** on AppFly: owned paths, no-touch lists, branches, and phased tasks. These are the normal engineering guides any collaborator or Cloud Agent can follow.

| Agent | File | Owns |
| --- | --- | --- |
| Composer (Cursor) | [COMPOSER.md](COMPOSER.md) | Orchestration, merges, CI, desktop, smoke |
| Claude | [CLAUDE.md](CLAUDE.md) | Product UI |
| Iyeke (GrokBot) | [GROK.md](GROK.md) | Backend engine |

Shared product law:

- [RULES.md](../../RULES.md)
- [AGENTS.md](../../AGENTS.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md), [API.md](../API.md), [STORAGE.md](../STORAGE.md), [FEATURES.md](../FEATURES.md)
- `.cursor/rules/branch-strategy.mdc`, `.cursor/rules/crawl-safety.mdc`

**Ship tip:** `origin/main` (ui-v1 + storage-v1 landed).  
**Prototype epic (when Composer opens it):** `integrate/prototype-v1` — siblings PR into that branch, not stale `main`.

Hard invariants: crawl deny-list; sealed packets; Keychain-only secrets; no CV bodies in list UIs; one concern → one `feat/…` PR.

---

Optional (not required for shipping the app): how one maintainer runs **multi-agent + local GPU coding** sits under [`docs/workflow/`](../workflow/README.md). Ignore that folder unless you are using that setup.
