# MVP epic sequence (`integrate/mvp-v1`)

Status: **Closed** — landed on `main` @ `5a5adc9` via #61 (2026-09-27). M1–M8 complete.

Owner was Grok (or Cursor as temp planner). Implementer: 5090 local coder under briefs.
Composer gated every M* PR; owned M5 and M8. Claude: on call only where noted.

Post-MVP: F3 Vitest landed in #62 (`main` @ `d9d7d15`). Epic `integrate/gaps-v1` (opened 2026-10-03) merged into `main` via #70 (`460c14c`). Later epics ui-honesty-v1, polish-v2 and mvp-blockers-v1 (Stage PR #152, `23768d2`) are on `main`. The current epic is **`integrate/polish-followups-v1`** (opened 2026-10-23 from `23768d2`). See [ORCHESTRATOR_HANDOFF.md](ORCHESTRATOR_HANDOFF.md) and [FOLLOW_UPS.md](../design/FOLLOW_UPS.md).

---

## Open the epic

Done 2026-09-27: `integrate/mvp-v1` pushed @ `ff61b86`. AGENTS / RULES / branch-strategy / FEATURES updated via `chore/docs-open-mvp-v1`.

```bash
git fetch origin
git checkout integrate/mvp-v1 && git pull --ff-only
git checkout -b feat/backend-doc-extract   # M1 first
```

---

## Wave order (do not start all at once)

| ID | Branch (suggested) | Stack | Depends on | Claude? | Summary |
| --- | --- | --- | --- | --- | --- |
| M1 | `feat/backend-doc-extract` | Backend | epic open | No | Opt-in `pypdf` / `python-docx`; fill `extracted.txt` on upload; empty-extract contract; never return bytes in list |
| M2 | `feat/backend-run-cv` | Backend | M1 | No | `POST /runs` body `{ "cv": "<id>" }`; writer uses that doc; default `active_cv`; sealed packet still one CV |
| M3 | `feat/ui-cv-picker` | Frontend | **M1 + M2 merged** | **Yes — call Claude before the brief** | CV picker on Tonight/Workflow from document **metadata** only; pass `cv` id |
| M4 | `feat/backend-cache-appdata` | Backend | epic open (parallel with M1 OK) | No | Embeddings under app-data `cache/embeddings`; migrate/document old `.cache/`; STORAGE.md note |
| M5 | Composer-owned | Desktop | Stage 1 on main | No (Composer) | Neutralino or Tauri shell + spawn API on loopback |
| M6 | TBD frontend | Frontend | **M5** | **Yes — call Claude before the brief** | First-launch wizard (init workspace → paste key → upload CV) |
| M7 | TBD frontend | Frontend | epic open (after Stage 1 UI stable) | **Yes — optional design pass** | Strip mock ledgers when `source === "api"`; mock only offline (F2) |
| M8 | Composer-owned | Privacy | **M5** packaged paths | No (Composer) | No secrets in logs/renderer/bundles; GET never returns CV bodies/keys; deny-list still enforced |

Deferred outside MVP waves: **F1** fetch listing (policy review first).

---

## When to call Claude

Call Claude **only** with a focused question + a rich pack when useful (screens,
API rows, privacy). Prefer the Mac Claude pack template under `docs/workflow/briefs/`
(e.g. [M3-claude-ask.md](briefs/M3-claude-ask.md)). Paste Claude’s copy/states/acceptance
into **sliced** 5090 briefs after a cloud check-in.

| Gate | Call Claude when |
| --- | --- |
| **M3** | After M1+M2 are on `integrate/mvp-v1`. Ask for picker placement, empty/offline/error copy, and “metadata only / never CV body” acceptance. Mac Claude only. |
| **M6** | After M5 shell can launch the UI. Ask for wizard step order and first-run honesty. |
| **M7** | Before mock-stripping briefs if banner/empty-state copy is unclear. |

Do **not** call Claude for M1/M2/M4 backend mechanics, M5 packaging choice (Composer + Grok), or M8 audit.
Do **not** use the Cursor IDE Claude agent for these calls (`.cursor/rules/claude-handoff.mdc`).

---

## Definition of done for Stage 2 start

- [x] Prototype on `main` (P7 + human sign-off)
- [x] `integrate/mvp-v1` pushed and announced
- [x] M1 brief ready for 5090 (ALLOWED FILES + extract contract)
- [x] Claude **not** yet — wait until M1+M2 land before M3 design call
