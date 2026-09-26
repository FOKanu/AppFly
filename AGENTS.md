# Agent notes

- Job listings from LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, and Glassdoor may only enter via the user's `_inbox/` clip. Never crawl those hosts and never send them to Apify.
- Enforcement: `jobhunt.policy` (`DENIED_CRAWL_HOSTS`, `assert_crawl_allowed`) at `backend/src/jobhunt/policy.py`.
- Writer packets stay sealed (one job + CV slice). Human approval before submit.

## Branching

Cursor rule: `.cursor/rules/branch-strategy.mdc` (always apply).

`integrate/<epic>` is the landing strip for **every** change in that epic — backend, frontend, docs, CI — whether it comes from a Cloud Agent or a collaborator. It is not a frontend-only lane.

### Layout

| Branch | Purpose |
|---|---|
| `main` | Shippable. No direct commits. Hotfixes that cannot wait for an epic. |
| `integrate/<epic>` | Inbox for that epic (all stacks). **No epic is open** — `ui-v1` and `storage-v1` have both landed on `main`. |
| `feat/<area>-<slug>` | One concern, one PR. Examples: `feat/backend-api`, `feat/ui-queue-packet`, `feat/docs-api`. |
| `fix/<slug>` | Bug fix against shipped `main`. |
| `chore/<slug>` | Tooling, docs, layout. |

Names: lowercase, hyphens, no author names. Retarget `cursor/…` Cloud Agent defaults to `feat/…`. Discard `cursor/backend-frontend-split-6388`.

### Where to cut and PR

1. Work that belongs to an open epic: `cloud_base_branch` / `git checkout` = `integrate/<epic>`; PR **into that branch**.
2. No epic: branch from `main`; PR into `main`.
3. Do not start parallel agents from stale `main` while an epic is open.

No epic is currently open. Branch from `main` and PR into `main`.

When an epic opens, name it here and every Cloud Agent prompt includes:

> Base: `integrate/<epic>`. Branch: `feat/<area>-<slug>`. Touch only owned paths. Do not recreate `backend/pyproject.toml` or `frontend/package.json`. PR into `integrate/<epic>`. Rebase before merge.

### Closed epics

- **ui-v1** — app chrome, Tonight/Workflow, Queue/Packet, Memory/Activity, Settings, mobile reflow. Landed on `main`.
- **storage-v1** — native SQLite store, Documents/Workspace APIs, Vault UI, Obsidian demoted to one-shot import. Landed on `main`.

### Cursor Cloud specific instructions

- Clone from **`main`** — no epic is open. When one is, clone from `integrate/<epic>` instead.
- PR against `main` (or the open `integrate/<epic>`). Backend work goes under `backend/`; UI under `frontend/`. Do not add a second `src/jobhunt` tree.
- Do not force-push `main` or `integrate/*`. Do not commit `.env`, vault notes, or API keys.

## Sibling agent playbooks

Role ownership for product work (paths, phases, no-touch lists):

- [docs/agents/COMPOSER.md](docs/agents/COMPOSER.md) — orchestration
- [docs/agents/CLAUDE.md](docs/agents/CLAUDE.md) — product UI
- [docs/agents/GROK.md](docs/agents/GROK.md) — Iyeke (GrokBot), backend engine
- Index: [docs/agents/README.md](docs/agents/README.md)

Optional maintainer-only multi-agent + local GPU coding flow (not required to ship): [docs/workflow/](docs/workflow/README.md).
