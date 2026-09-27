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
| `integrate/<epic>` | Inbox for that epic (all stacks). **Current prototype epic: `integrate/prototype-v1`.** `ui-v1` and `storage-v1` landed on `main`. |
| `feat/<area>-<slug>` | One concern, one PR. Examples: `feat/backend-api`, `feat/ui-queue-packet`, `feat/docs-api`. |
| `fix/<slug>` | Bug fix against shipped `main`. |
| `chore/<slug>` | Tooling, docs, layout. |

Names: lowercase, hyphens, no author names. Retarget `cursor/…` Cloud Agent defaults to `feat/…`. Discard `cursor/backend-frontend-split-6388`.

### Where to cut and PR

1. Work that belongs to an open epic: `cloud_base_branch` / `git checkout` = `integrate/<epic>`; PR **into that branch**.
2. No epic: branch from `main`; PR into `main`.
3. Do not start parallel agents from stale `main` while an epic is open.

While **prototype-v1** is open, every Cloud Agent prompt includes:

> Base: `integrate/prototype-v1`. Branch: `feat/<area>-<slug>`. Touch only owned paths. Do not recreate `backend/pyproject.toml` or `frontend/package.json`. PR into `integrate/prototype-v1`. Rebase before merge.

No parallel forks of `main` while this epic is open.

When an epic opens, name it here and every Cloud Agent prompt includes the Base/Branch/PR block above (generic form uses `integrate/<epic>`).

**Who does what:** Grok opens and closes epics (`integrate/<epic>`), plans tasks, and writes PR text. The RTX 5090 local coder implements. Composer (Cursor) is the merge and CI gate: it runs CI and smoke, then merges. See [docs/workflow/MULTI_AGENT.md](docs/workflow/MULTI_AGENT.md) (including §1a compute modes: **default** = current mixed split; **optimized** = optional / token-limit fallback). When Grok Bot usage is exhausted, Cursor may temporarily run the planner loop; log that in [docs/workflow/ORCHESTRATOR_HANDOFF.md](docs/workflow/ORCHESTRATOR_HANDOFF.md).

### Live tip (avoid double work)

- **Base every prototype PR on** `origin/integrate/prototype-v1` (tip as of 2026-09-27: `06fa6d8`, Post-B4 UI / #41). `git fetch origin` before cutting a branch.
- **Do not** reopen or continue closed `cursor/*` PRs (#1–#10 era); that UI already landed via `feat/ui-*`.
- **B1–B4 + UI waves landed.** **Next:** P7 smoke (manual happy path) → human sign-off → Composer opens `integrate/prototype-v1` → `main`. Then Grok opens `integrate/mvp-v1` (or Cursor while Grok credits are out).
- `main` may lag the epic until Composer merges `integrate/prototype-v1` → `main`. Prefer integrate while the epic is open.

### Closed epics

- **ui-v1** — app chrome, Tonight/Workflow, Queue/Packet, Memory/Activity, Settings, mobile reflow. Landed on `main`.
- **storage-v1** — native SQLite store, Documents/Workspace APIs, Vault UI, Obsidian demoted to one-shot import. Landed on `main`.

### Cursor Cloud specific instructions

- Clone from **`integrate/prototype-v1`**, not `main`, for this epic.
- PR against `integrate/prototype-v1`. Backend work goes under `backend/`; UI under `frontend/`. Do not add a second `src/jobhunt` tree.
- Do not force-push `main` or `integrate/*`. Do not commit `.env`, vault notes, or API keys.

## Agent roles and playbooks

Operating model (2026-09-26): one cloud planner (Grok) + local-first coding on the RTX 5090.

- [docs/agents/GROK.md](docs/agents/GROK.md) — Grok (Grokbot / Iyeke): single planner and orchestrator for backend and frontend; opens epics; briefs, review, PR text; backend engine owner
- [docs/agents/LOCAL_CODER.md](docs/agents/LOCAL_CODER.md) — RTX 5090 local coder: all mechanical work from Grok's briefs
- [docs/agents/COMPOSER.md](docs/agents/COMPOSER.md) — Composer (Cursor): merge and CI gate, smoke, desktop packaging (M5), privacy pass (M8)
- [docs/agents/CLAUDE.md](docs/agents/CLAUDE.md) — Claude: on call for UI/UX design decisions and UI review
- Index: [docs/agents/README.md](docs/agents/README.md)

Loop, escalation rules, prompts, and token log: [docs/workflow/](docs/workflow/README.md). Product contributors don't need that folder to open a normal PR.
