# Claude handoff pack — M6 first-launch wizard

**Audience:** Mac Claude (Code CLI / Desktop). Not Cursor Claude agent.
**Strategy:** Richer context OK; one concern; return pasteable acceptance. Cloud admin check-in before any `feat/ui-firstrun-wizard` slices.
**Rule:** [`.cursor/rules/claude-handoff.mdc`](../../.cursor/rules/claude-handoff.mdc).

---

## Role

You are Claude for AppFly, on call for UI/UX design only ([docs/agents/CLAUDE.md](../../agents/CLAUDE.md)).
You are not the planner and do not own branches. Do not write large code patches unless asked.

Obey: RULES.md privacy (no CV bodies in lists/UI, no secrets echoed in GET or renderer, no browser job-board fetches), docs/API.md, instrument-panel patterns in `frontend/src/`.

---

## Product context (landed)

- Epic tip: `integrate/mvp-v1` @ `759b508` (M5 Neutralino desktop shell #57 merged).
- M6 = **first-launch wizard** in the desktop (and browser) app: init workspace → paste Gemini key → upload CV.
- Suggested branch after this decision: `feat/ui-firstrun-wizard`.
- Desktop shell: `desktop/` serves built UI on `:5174`, spawns API on `:8787`. No wizard UI yet.
- Existing readiness (not a wizard): `GET /workspace/status` → `has_cv`, `has_voice`, `has_gemini`, `has_keywords`, `data_path`, `storage_backend`. Settings `WorkspacePanel` shows a checklist + `POST /workspace/init`. Vault has empty-state firstrun copy. No full-screen gate today — user lands on Tonight.

### APIs the wizard may use

| Step | API | Notes |
| --- | --- | --- |
| Init store | `POST /workspace/init` | Ensures native app-data; returns readiness |
| Status / gate | `GET /workspace/status` | Same shape; use for “skip if already ready” |
| Paste key | `PUT /settings/secrets/gemini` body `{ "value" }` | Write-only; response `{ configured: true }` only |
| Upload CV | `POST /documents` multipart `kind=cv` | Returns metadata + `extract_status`; never show body |
| Optional set active | `PATCH /documents/{id}` | If upload does not auto-activate |

Do **not** invent new endpoints. Voice sample and keywords are **optional** for MVP exit (wizard may mention them as “later in Settings/Vault” or include as skippable steps — decide).

### Screens / patterns to reuse

| Piece | Path |
| --- | --- |
| App routes / shell | `frontend/src/App.tsx`, `app/layout/AppShell.tsx` |
| Workspace checklist | `features/settings/WorkspacePanel.tsx` |
| Secret field (write-only) | `features/settings/` ConnectorKeyField / settingsApi |
| Upload | `features/vault/UploadZone.tsx` |
| Tokens / Button / Banner | `shared/ui/` |

---

## Focused ask

Decide and specify:

1. **When it shows** — first desktop launch only? Also browser? Gate until `has_cv && has_gemini`? Local flag (`localStorage` / Neutralino storage) vs pure API readiness?
2. **Step order** — confirm or revise: (1) init workspace / show data path, (2) paste Gemini key, (3) upload CV. Include voice/keywords? Skip vs Next?
3. **Shell vs overlay** — full-route `/setup` outside AppShell, modal over AppShell, or replace Tonight until done?
4. **Copy + states** — loading, API down, init error, key save error, upload empty/unsupported extract, “already configured” skip.
5. **Exit** — where user lands; can they reopen wizard from Settings?
6. **Acceptance criteria** — pasteable bullets for sliced 5090 briefs (privacy: never show key or CV body).

## Output format (strict)

1. **Decision** + 1–3 reasons  
2. **States table** — state → UI → copy  
3. **Acceptance criteria** — pasteable bullets for Grok → 5090  
4. **Privacy check** — pass/fail notes  
5. **Flags for cloud** — open questions or method choices before coding  

Keep it short. No epic replan. No multi-file code dump.
