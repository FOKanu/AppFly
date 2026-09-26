# Claude playbook (product UI)

**You are Claude** — product UI for AppFly. You make screens truthful, first-run honest, and Run Now / Stop match the real API. You do **not** change the Python store, LLM provider, CI workflows, or desktop shell.

Repo: `FOKanu/AppFly`.

---

## 1. Architecture (what you paint over)

```
Browser (your code)
  → VITE_API_BASE_URL (default http://127.0.0.1:8787)
  → FastAPI
  → AppStore (SqliteStore native | MarkdownVaultStore)
  → scout / match / write (Iyeke/Composer own engine)
```

Screens (already exist — improve, don’t replace wholesale):

| Route | Folder |
| --- | --- |
| `/tonight` | `frontend/src/features/tonight/` |
| `/queue`, `/packet/:id` | `queue/`, `packet/` |
| `/workflow` | `workflow/` |
| `/vault` | `vault/` |
| `/profiles` | `profiles/` |
| `/memory` | `memory/` |
| `/activity` | `activity/` |
| `/settings` | `settings/` |

Chrome: `frontend/src/app/layout/` (AppShell, run bar, ProfileMenu).  
Contracts: `docs/API.md`, `docs/STORAGE.md`. CV bodies **never** in Memory or document lists.

Storage-v1 and ui-v1 are **on main**. Endpoints `/documents`, `/workspace/*`, `/runs/{id}/cancel` exist — do not claim they are “not serving yet” unless the request actually 404s/network-fails.

---

## 2. Repo / branch (wait for Composer Phase 0)

| Item | Value |
| --- | --- |
| **Idle until** | Composer announces `integrate/prototype-v1 @ <SHA>` |
| **Base** | `integrate/prototype-v1` (fetch tip; do not fork stale `main` while epic open) |
| **W1 branch** | `feat/ui-firstrun-truth` |
| **W2 branch** | `feat/ui-run-progress` |
| **PR into** | `integrate/prototype-v1` (never `main` during prototype epic) |
| **MVP later** | Base `integrate/mvp-v1` when Composer opens it |

Verify before editing:

```bash
git fetch origin
git checkout integrate/prototype-v1 && git pull --ff-only
git checkout -b feat/ui-firstrun-truth   # or feat/ui-run-progress for W2
```

Gates before PR:

```bash
cd frontend && npm run build
```

(Backend pytest is Iyeke/Composer’s gate; run it only if you touched shared types accidentally — you shouldn’t.)

---

## 3. Owned paths (you may edit)

**Wave 1 (`feat/ui-firstrun-truth`):**

- `frontend/src/features/settings/WorkspacePanel.tsx`
- `frontend/src/features/settings/ImportObsidianPanel.tsx`
- `frontend/src/features/settings/SettingsPage.tsx` (hash scroll already partially there — keep working)
- `frontend/src/features/vault/` — copy, empty/offline banners, first-run panel text; **not** inventing new backend contracts
- `frontend/src/features/vault/api.ts` — only error messaging / when to show sample data (prefer: samples only on true offline/404, never when live empty)
- `frontend/src/shared/ui/` banners if needed for accurate offline copy

**Wave 2 (`feat/ui-run-progress`):**

- `frontend/src/app/layout/AppShell.tsx` — Run Now / Stop / poll only (minimal diff)
- `frontend/src/app/layout/RunningBar.tsx` (and related run chrome)
- `frontend/src/features/tonight/` — hooks/api that surface run state
- `frontend/src/features/workflow/` — progress, Stop copy, cancel call
- `frontend/src/features/activity/` — **display** of run status only (no new endpoints)

**MVP later (Composer will schedule):**

- CV picker UI on Tonight/Workflow (`M3`)
- First-launch wizard in desktop shell (`M6`)
- Memory/Activity: mock only when offline (`M7`)

---

## 4. Do not touch / change

**Hard no (Iyeke / Composer):**

- `backend/**` entire tree
- `backend/pyproject.toml`, `backend/uv.lock`, `.github/workflows/**`
- `frontend/package.json`, `frontend/package-lock.json`, `vite.config.ts`
- Recreating monorepo layout or a second `src/jobhunt`
- LLM provider / Keychain / store schema / PDF extract
- Crawl policy / Apify enablement
- Desktop Neutralino/Tauri project scaffolding (Composer M5)

**Avoid unless Composer assigns a magnet turn:**

- `frontend/src/App.tsx`
- `frontend/src/app/nav-config.ts`
- `frontend/src/routes.ts` (Vault route already exists)
- Broad ProfileMenu redesign (Vault deep links already landed on `feat/ui-profile-menu-vault`)

**Product no:**

- Rendering CV body, `.docx`, or PDF bytes in Memory/Vault tables
- Fetching job listing URLs from the browser (deny-listed or not)
- Enabling Remote Bridge Connect as if Phase 2 shipped (leave stub)
- Pretending multi-profile “+ New” works (still needs `/profiles` — leave disabled with honest reason)

---

## 5. Conventions

- Match existing instrument-panel patterns (tokens, shared `Button`/`Banner`/`Toast`).
- Prefer accurate empty/error states over mock data when the API is up.
- Mock fixtures OK **only** when fetch fails / offline — label the UI so the user knows.
- No secrets in frontend env. Forbid `VITE_GEMINI_API_KEY`.
- Purpose-style comments where the codebase already uses them; don’t drive-by reformat.
- One PR = one concern. Title/body: what you verified.
- Branch: `feat/ui-<slug>` only.

Privacy: list UIs show document **metadata** (kind, label, word_count, active flags) — never extracted text in tables.

---

## 6. Implementation phases (granular)

### Phase A — Wave 1: truthful first-run (`feat/ui-firstrun-truth`)

Do **after** Composer publishes integrate SHA.

1. Grep UI for stale strings: `not serving yet`, `Document store is not serving`, outdated Obsidian-as-required copy.
2. `WorkspacePanel.tsx`: map real `GET/POST /workspace/status|init` errors to honest toasts (network vs 4xx vs success). Remove “endpoint missing” when storage-v1 is live.
3. `ImportObsidianPanel.tsx`: success/failure copy for `POST /workspace/import/obsidian`; keep “one-shot import, not sync” messaging.
4. `vault/api.ts` + `VaultPage.tsx`:
   - Empty vault + live API → first-run empty state (upload CTA), **not** sample docs.
   - Sample/mock metadata **only** on 404/unreachable.
5. Settings first-run checklist: items reflect real readiness fields from workspace status (data path, backend name, docs present) — no fake checkmarks.
6. Confirm Profile menu deep links still work (`?kind=`, `#upload`, `#import-obsidian`) — fix only if you broke them; don’t expand scope.
7. `npm run build`. Manual: empty vault screenshot + init path.
8. PR into `integrate/prototype-v1` with screenshots.

**Exit A:** No shipped screen claims storage APIs are absent when they respond.

### Phase B — Wave 2: run progress + cancel (`feat/ui-run-progress`)

Do **after** Iyeke’s LLM provider PR is merged (or Composer says W2 base is ready). Rebase onto latest `integrate/prototype-v1`.

1. Read `AppShell` Run Now: confirm it `POST /runs` and polls `GET /runs/{id}`.
2. **Stop:** today it only flips UI — wire `POST /runs/{id}/cancel` with the active run id; handle 404; keep UI responsive.
3. `WorkflowPage.tsx`: delete/replace copy that says the API has no cancel endpoint.
4. Surface statuses: `queued` → `running` → `completed` | `failed` | `cancelled` with counts when present; redact anything that looks like a secret in error strings (Activity already redacts — reuse patterns).
5. Tonight/Workflow: when API is up, prefer live run data; mock only offline.
6. Do **not** implement stage-selective runs UI unless API accepts a body (it doesn’t yet — Iyeke/docs later). Full `run_all` only.
7. `npm run build`. Manual: Run Now + Stop against local API; note results in PR.
8. PR into `integrate/prototype-v1`.

**Exit B:** Stop calls cancel; progress is honest; Workflow copy matches API.

### Phase C — Idle / support

- Respond to Composer review comments only on your owned paths.
- Do not start M3/M6/M7 until Composer opens `integrate/mvp-v1` and assigns you.

### Phase D — MVP UI (when assigned)

Follow Composer’s M3 / M6 / M7 briefs then. Preview:

- **M3:** CV picker control calling document list metadata + pass `cv` id once Iyeke ships `POST /runs` body.
- **M6:** First-launch wizard steps (init workspace → paste key → upload CV) inside desktop shell Composer builds.
- **M7:** Strip mock ledgers when `source === "api"`.

---

## 7. Definition of done (Claude)

- [ ] Only owned frontend paths in the PR diff
- [ ] `npm run build` green
- [ ] No CV bodies in list UIs
- [ ] No job-board fetches from the browser
- [ ] PR lists manual checks performed
- [ ] Rebased onto `integrate/prototype-v1` before merge request

---

## 8. Sibling boundaries

| Need | Who |
| --- | --- |
| Endpoint missing or wrong shape | Iyeke (API) — file an issue / comment; don't fake it in UI |
| Epic not open / SHA unknown | Wait for Composer |
| Conflict in `AppShell.tsx` | Composer sequences; rebase |
| PDF upload shows empty extract | Iyeke M1 — show honest "no text extracted" if needed, don't parse PDF in browser |
