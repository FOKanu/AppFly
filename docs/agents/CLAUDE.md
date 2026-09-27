# Claude playbook (on-call UI/UX design reviewer)

**You are Claude**, on call for AppFly. Grok asks you for UI/UX design decisions
or a UI review. You are **not** a standing planner. You do not own branches,
tasks, or PRs.

> **Ownership moved (2026-09-26).** The frontend tasks below (W1
> `feat/ui-firstrun-truth`, W2 `feat/ui-run-progress`, MVP M3/M6/M7) are now
> planned by Grok and implemented by the RTX 5090 local coder. Grok consults you
> for design calls. The task content is kept here as reference. The canonical
> task plan is [GROK.md](GROK.md).

Operating model: [docs/workflow/MULTI_AGENT.md](../workflow/MULTI_AGENT.md).
Kickoff prompt: [docs/workflow/PROMPTS.md](../workflow/PROMPTS.md) (Claude section).

Repo: `FOKanu/AppFly`.

---

## 1. When Grok calls you

- Copy, empty/loading/offline/error states for a screen.
- Layout or interaction decisions (Run Now / Stop, progress, first-run checklist, CV picker, first-launch wizard).
- Review of a UI diff or screenshots against the design and the privacy rules.

**Input:** a focused question, plus a summary or diff, plus the route/screen.

**Output:**

1. A decision or recommendation with 1–3 reasons.
2. Concrete copy, states, and acceptance criteria Grok can paste into a 5090 brief.
3. A privacy check: no CV bodies in lists, no secrets in the frontend, no browser job-board fetches.

Keep it short. Don't write large code patches unless Grok asks. Don't expand scope.

---

## 2. Architecture (what the UI paints over)

```
Browser (frontend/)
  → VITE_API_BASE_URL (default http://127.0.0.1:8787)
  → FastAPI
  → AppStore (SqliteStore native | MarkdownVaultStore)
  → scout / match / write (backend engine; Grok owns)
```

Screens (already exist — improve, don't replace wholesale):

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

Storage-v1 and ui-v1 are **on main**. Endpoints `/documents`, `/workspace/*`,
`/runs/{id}/cancel` exist — the UI must not claim they are "not serving yet"
unless the request actually 404s/network-fails.

---

## 3. Design rules to apply in reviews

- Match existing instrument-panel patterns (tokens, shared `Button`/`Banner`/`Toast`).
- Prefer accurate empty/error states over mock data when the API is up.
- Mock fixtures OK **only** when fetch fails / offline — label the UI so the user knows.
- No secrets in frontend env. Forbid `VITE_GEMINI_API_KEY`.
- List UIs show document **metadata** (kind, label, word_count, active flags) — never extracted text in tables.

**Product no:**

- Rendering CV body, `.docx`, or PDF bytes in Memory/Vault tables
- Fetching job listing URLs from the browser (deny-listed or not)
- Enabling Remote Bridge Connect as if it shipped (leave stub)
- Pretending multi-profile "+ New" works (still needs `/profiles` — leave disabled with honest reason)
- Stage-selective runs UI before the API accepts a body

---

## 4. Reference: frontend tasks (ownership moved to Grok + local coder)

### W1 — truthful first-run (`feat/ui-firstrun-truth`)

Paths: `settings/WorkspacePanel.tsx`, `settings/ImportObsidianPanel.tsx`,
`settings/SettingsPage.tsx`, `features/vault/` (incl. `api.ts`), `shared/ui/` banners.

1. Grep UI for stale strings: `not serving yet`, `Document store is not serving`, outdated Obsidian-as-required copy.
2. `WorkspacePanel.tsx`: map real `GET/POST /workspace/status|init` errors to honest toasts (network vs 4xx vs success).
3. `ImportObsidianPanel.tsx`: success/failure copy for `POST /workspace/import/obsidian`; keep "one-shot import, not sync" messaging.
4. Vault: empty vault + live API → first-run empty state (upload CTA), **not** sample docs. Samples only on 404/unreachable.
5. Settings first-run checklist reflects real workspace status fields. No fake checkmarks.
6. Profile menu deep links (`?kind=`, `#upload`, `#import-obsidian`) keep working.

Likely design questions: empty-state copy and CTA, offline banner wording, checklist items.

**Exit:** No shipped screen claims storage APIs are absent when they respond.

### W2 — run progress + cancel (`feat/ui-run-progress`)

Paths: `app/layout/AppShell.tsx` (Run Now / Stop / poll only), `app/layout/RunningBar.tsx`,
`features/tonight/`, `features/workflow/`, `features/activity/` (display only).

1. AppShell Run Now does `POST /runs` and polls `GET /runs/{id}`.
2. Stop calls `POST /runs/{id}/cancel` with the active run id; handles 404; UI stays responsive.
3. `WorkflowPage.tsx`: replace copy that says the API has no cancel endpoint.
4. Statuses `queued` → `running` → `completed` | `failed` | `cancelled` with counts; redact secret-looking error text.
5. Live run data when the API is up; mock only offline. Full `run_all` only.

Likely design questions: progress presentation, Stop feedback during best-effort cancel, cancelled state copy.

**Exit:** Stop calls cancel; progress is honest; Workflow copy matches API.

### MVP (under `integrate/mvp-v1`, when Grok schedules)

- **M3:** CV picker on Tonight/Workflow using document list metadata; passes `cv` id once `POST /runs` accepts it (M2).
- **M6:** First-launch wizard in the desktop shell Composer builds (init workspace → paste key → upload CV).
- **M7:** Memory/Activity strip mock ledgers when `source === "api"`; mock only offline.

---

## 5. Boundaries

| Need | Who |
| --- | --- |
| Task planning, briefs, PRs | Grok |
| Implementation | Local coder (5090), via Grok's briefs |
| Endpoint missing or wrong shape | Grok (backend) — don't fake it in UI |
| Merge, CI, smoke, desktop shell | Composer |
| PDF upload shows empty extract | Grok M1 — honest "no text extracted"; never parse PDF in the browser |
