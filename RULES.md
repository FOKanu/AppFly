# Rules

**Read this before any code change.** It is the short form. The long forms are
[`AGENTS.md`](AGENTS.md) (branching, policy) and
[`.cursor/rules/branch-strategy.mdc`](.cursor/rules/branch-strategy.mdc).

Applies equally to humans, Cloud Agents, and CLI agents. No exceptions for
"small" changes.

---

## 1. Current state — check this first

| | |
|---|---|
| **Open epic** | **`integrate/prototype-v1`.** `ui-v1` and `storage-v1` have landed on `main`. |
| **Where to branch from** | `integrate/prototype-v1` |
| **Where to PR** | `integrate/prototype-v1` |

When no epic is open, branch from `main` and PR into `main`. Never fork `main`
in parallel while an epic is open, because it duplicates `frontend/`,
`src/jobhunt`, and lockfiles.

## 2. Branching

- One concern → one branch → one PR. Delete the branch after it merges.
- Names are **lowercase, hyphenated, no author names**: `feat/<area>-<slug>`,
  `fix/<slug>`, `chore/<slug>`. Area may be `backend-`, `ui-`, `secrets-`,
  `docs-`, `ci-`.
- **Never keep a `cursor/…` name.** Rename to `feat/…` before the branch lands.
- **`main` is PR-only.** No direct commits, no direct pushes.
- Rebase onto the base branch before merge. Land with `--no-ff` so each merge
  keeps its own record.
- **Never force-push `main` or `integrate/*`.**

## 3. Before you open a PR, these must pass

```bash
cd backend  && python -m pytest        # 63 tests at time of writing
cd frontend && npm run build           # tsc --noEmit && vite build
```

Known gap: `frontend/src/**/*.test.*` files exist, but `vitest` is **not** a
dependency and there is no `test` script — those tests do not run. Do not
assume they gate anything.

## 4. Do not recreate what already exists on the base

`backend/pyproject.toml`, `frontend/package.json`, `backend/uv.lock`,
`frontend/package-lock.json`, `vite.config.ts`. Do not add a second
`src/jobhunt` tree.

Shared magnets — `frontend/src/App.tsx`, `backend/src/jobhunt/cli.py`,
`docs/FEATURES.md` — cause conflicts. Sequence the PRs, or keep doc edits to
append-only rows.

## 5. Scraping policy — hard stop

Job listings from **LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, and
Glassdoor** may only enter via the user's `_inbox/` clip. Never crawl those
hosts. Never send them to Apify. Uploaded URLs are not crawled.

Enforced by `DENIED_CRAWL_HOSTS` / `assert_crawl_allowed` in
[`backend/src/jobhunt/policy.py`](backend/src/jobhunt/policy.py).

## 6. Secrets and privacy

- Secrets live in the **OS Keychain** only. Never in git, never in SQLite,
  never in a document body, never in a log.
- Never commit `.env`, `config.yaml`, vault notes, or API keys.
- List and metadata APIs never return a CV body, `.docx`/PDF bytes, or keys.
  `GET /documents` is metadata-only **by contract** — it has no body field.
- The writer receives exactly one CV text slice, in-process, inside a sealed
  packet. Packets stay sealed: one job, one CV slice.
- **Human approval before any submit.** No agent submits an application.

## 7. Storage

- `native` (SQLite + files under the app data dir) is the default. Obsidian is
  **optional**.
- Obsidian is a **one-shot import only** — `POST /workspace/import/obsidian`.
  No dual-write, no live sync, AppFly never writes back to a vault.
- Go through the store protocols in `backend/src/jobhunt/store/`, not raw
  paths. See [`docs/STORAGE.md`](docs/STORAGE.md).

## 8. Reporting

Say what you actually ran and what it actually returned. If a step was skipped
or a test failed, say so. Do not report work as complete that has not been
verified.
