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
| `integrate/<epic>` | Inbox for that epic (all stacks). **Current: `integrate/ui-v1`.** |
| `feat/<area>-<slug>` | One concern, one PR. Examples: `feat/backend-api`, `feat/ui-queue-packet`, `feat/docs-api`. |
| `fix/<slug>` | Bugfix against shipped `main`. |
| `chore/<slug>` | Tooling, docs, layout. |

Names: lowercase, hyphens, no author names. Retarget `cursor/…` Cloud Agent defaults to `feat/…`. Discard `cursor/backend-frontend-split-6388`.

### Where to cut and PR

1. Work that belongs to an open epic: `cloud_base_branch` / `git checkout` = `integrate/<epic>`; PR **into that branch**.
2. No epic: branch from `main`; PR into `main`.
3. Do not start parallel agents from stale `main` while an epic is open.

While **ui-v1** is open, every Cloud Agent prompt includes:

> Base: `integrate/ui-v1`. Branch: `feat/<area>-<slug>`. Touch only owned paths. Do not recreate `backend/pyproject.toml` or `frontend/package.json`. PR into `integrate/ui-v1`. Rebase before merge.

### Owned paths (ui-v1)

- Toolchain already on this branch (A0): `backend/`, `frontend/` scaffold, `docs/`
- API: `backend/src/jobhunt/api/`, `backend/src/jobhunt/features/pipeline/`
- Secrets: `backend/src/jobhunt/features/secrets/`
- Shell: `frontend/src/app/layout/`, `frontend/src/shared/ui/`
- Screens: `frontend/src/features/<name>/` only
- Mobile/edge: `frontend/src/app/layout/mobile/`, shared banners / empty states

Merge order: A0 (done) → A1+A2 → A3 → A4–A8 → PR `integrate/ui-v1` into `main`.

### Cursor Cloud specific instructions

- Clone from **`integrate/ui-v1`**, not `main`, for this epic.
- PR against `integrate/ui-v1`. Backend work goes under `backend/`; UI under `frontend/`. Do not add a second `src/jobhunt` tree.
- Do not force-push `main` or `integrate/*`. Do not commit `.env`, vault notes, or API keys.
