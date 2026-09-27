# Claude handoff pack — M3 CV picker

**Audience:** Mac Claude (Code CLI / Desktop). Not Cursor Claude agent.
**Strategy:** Richer context than a 5090 brief is OK; still one concern; return pasteable acceptance. Cloud admin check-in before any `feat/ui-cv-picker` Aider slices.
**Rule:** [`.cursor/rules/claude-handoff.mdc`](../../.cursor/rules/claude-handoff.mdc).

---

## Role

You are Claude for AppFly, on call for UI/UX design only ([docs/agents/CLAUDE.md](../agents/CLAUDE.md)).
You are not the planner and do not own branches. Do not write large code patches unless asked.

Obey: RULES.md privacy (no CV bodies in lists, no secrets in frontend, no browser job-board fetches), docs/API.md, instrument-panel patterns in `frontend/src/`.

---

## Product context (landed)

- Epic tip: `integrate/mvp-v1` @ `e7843e6` (M1 extract + M2 `POST /runs` optional `{ "cv": "<document_id>" }` merged).
- M3 = CV picker on Tonight / Workflow. Suggested branch: `feat/ui-cv-picker`.
- Run Now: `frontend/src/shared/run/useRunController.ts` → `apiPost("/runs")` with **no body** today. After M3 it should be able to send `{ cv }`.
- Documents: `GET /documents` metadata only (`id`, `kind`, `label`, `word_count`, `active_cv`, `extract_status`, …). `GET /documents/{id}/text` is for the engine — picker/list UIs must not show CV body.
- Vault already uploads and can set `active_cv`. M3 is choosing which CV for **this run** (may differ from active).

## Screens / chrome

| Route | Folder | Role for M3 |
| --- | --- | --- |
| AppShell run chrome | `frontend/src/app/layout/` + `shared/run/` | Owns Run Now / Stop / poll |
| `/tonight` | `frontend/src/features/tonight/` | Tonight surface; may show picker near run CTA |
| `/workflow` | `frontend/src/features/workflow/` | Workflow surface; same |
| `/vault` | `frontend/src/features/vault/` | Source of truth for document metadata (reuse list API, not bodies) |

Match existing tokens / `Button` / `Banner` / `Toast`. Prefer honest empty/error over mocks when API is up.

---

## Focused ask

Decide and specify:

1. **Placement** — Tonight only, Workflow only, AppShell near Run Now, or shared control used on both.
2. **Default** — `active_cv` vs last-used-for-run vs force explicit pick before Run Now.
3. **States + copy** — loading, empty (no CVs), offline/API down, error, `extract_status` empty/unsupported (can still select? warn?).
4. **POST body** — always send `{ cv }`, or only when overriding active? What if selection is active CV?
5. **Acceptance criteria** — bullets for a sliced 5090 brief (metadata only / never CV body).

## Output format (strict)

1. **Decision** + 1–3 reasons  
2. **States table** — state → UI → copy  
3. **Acceptance criteria** — pasteable bullets for Grok → 5090  
4. **Privacy check** — pass/fail notes  
5. **Flags for cloud** — open questions or method choices the orchestrator must resolve before coding  

Keep it short. No epic replan. No multi-file code dump.
