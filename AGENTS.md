# Agent notes

- Job listings from LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, and Glassdoor may only enter via the user's `_inbox/` clip. Never crawl those hosts and never send them to Apify.
- Enforcement: `jobhunt.policy` (`DENIED_CRAWL_HOSTS`, `assert_crawl_allowed`) at `backend/src/jobhunt/policy.py`.
- Writer packets stay sealed (one job + CV slice). Human approval before submit.

## Branching

Cursor rule: `.cursor/rules/branch-strategy.mdc` (always apply). Follow it for every local and Cloud Agent run.

### Layout

| Branch | Purpose |
|---|---|
| `main` | Shippable. No direct commits. PR only. |
| `integrate/<epic>` | Epic assembly line. **Current: `integrate/ui-v1` (exists — cut all ui-v1 work from here).** |
| `feat/<area>-<slug>` | One feature, one PR. Examples: `feat/backend-api`, `feat/ui-queue-packet`. |
| `fix/<slug>` | Bugfix against shipped `main`. |
| `chore/<slug>` | Tooling, docs, layout. |

Names: lowercase, hyphens, no author names. Do not treat `cursor/…` Cloud Agent defaults as the long-term name; retarget the PR to `feat/…`. Discard `cursor/backend-frontend-split-6388`.

### Base branch (Cloud Agents)

Set `cloud_base_branch` to **`integrate/ui-v1`**. Never start parallel UI/API agents from `main` while this epic is open — `main` still lacks `backend/` and `frontend/` and agents will each scaffold a second Vite app.

Prompt every Cloud Agent with:

> Base: `integrate/ui-v1`. Branch: `feat/<area>-<slug>`. Touch only the owned paths below. Do not recreate `frontend/package.json` or `backend/pyproject.toml`. PR into `integrate/ui-v1`. Rebase before merge.

### Owned paths (ui-v1)

- Layout / docs / frontend toolchain: already on `integrate/ui-v1` (from A0)
- API: `backend/src/jobhunt/api/`, `backend/src/jobhunt/features/pipeline/`
- Secrets: `backend/src/jobhunt/features/secrets/`
- Shell: `frontend/src/app/layout/`, `frontend/src/shared/ui/`
- Screens: `frontend/src/features/<name>/` only
- Mobile/edge: `frontend/src/app/layout/mobile/`, shared empty/error/offline banners

Merge order: A0 (done on this branch) → A1+A2 → A3 → A4–A8 → PR `integrate/ui-v1` into `main`.

### Cursor Cloud specific instructions

- Clone `FOKanu/AppFly` from **`integrate/ui-v1`**, not `main`.
- Push a `feat/…` branch and open a PR against `integrate/ui-v1`.
- Do not force-push `main` or `integrate/ui-v1`. Do not commit `.env`, vault notes, or API keys.
- The base already has `frontend/` and `backend/`. Add files under those trees. Do not copy `src/jobhunt` into a second tree.
