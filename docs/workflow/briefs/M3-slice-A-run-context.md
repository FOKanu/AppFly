You are the local coder on AppFly. Implement ONLY this slice. No planning essays. Do not commit.

REPO: FOKanu/AppFly (WSL on 5090: ~/work/AppFly)
BRANCH: feat/ui-cv-picker (already checked out from integrate/mvp-v1)

This is M3 slice A only (types + run context + POST body). Picker UI is slice B. Do not edit ControlHeader or Workflow pages.

ALLOWED FILES:
- frontend/src/shared/run/RunContext.ts
- frontend/src/shared/run/useRunController.ts
- frontend/src/shared/run/types.ts
- frontend/src/features/vault/types.ts
- frontend/src/features/vault/api.ts

FORBIDDEN: everything else, especially package.json, lockfiles, ControlHeader, Workflow, AppShell layout chrome beyond RunContext consumers if not listed, backend/**, docs/**

CONTEXT (from Mac Claude M3 decision + cloud check-in):
- POST /runs accepts optional { "cv": "<document_id>" } (M2 landed).
- GET /documents returns metadata including extract_status; never fetch /documents/{id}/text in this feature.
- Run Now paths all call run.start() from shared RunContext.
- Default selection = active_cv; session override only; no localStorage.
- F1 deferred (no run cv_id backend). F2: UI will disable run when no usable CV (wire runDisabled/runTitle here so chrome can use it; picker UI in B).

BRIEF:
1. Add `extract_status?: "ok" | "empty" | "unsupported" | "error"` to VaultDocument in vault/types.ts (backend already returns it).
2. Define CvOption = { id, label, word_count, active_cv, extract_status } with no body/text fields. Export from shared/run/types.ts (or RunContext).
3. Extend RunController / IDLE_RUN with:
   - cvId: string | null
   - setCvId: (id: string | null) => void
   - cvOptions: CvOption[]
   - cvState: "loading" | "ready" | "empty" | "error" | "offline"
   - cvLabel: string (selected label or "" for Workflow "Using:" later)
4. In useRunController:
   - On mount (and expose a refreshCvs callback if easy), GET /documents via existing vault listDocuments or apiGet("/documents"), filter kind==="cv", map to CvOption.
   - Set cvState accordingly (loading/ready/empty/error/offline using isUnreachable).
   - Default cvId to the option with active_cv===true when list loads / active id changes; never persist to localStorage.
   - start(): if cvId set, apiPost("/runs", { cv: cvId }); else apiPost("/runs") with no body.
   - On POST 404: toast "That CV is no longer in Vault. Switched back to your active CV."; reload list; reset cvId to active; return to idle. Keep existing 409/timeout behaviour.
   - runDisabled / runTitle: when cvState==="empty" OR (cvId set and selected option extract_status !== "ok"), disable and set titles from Claude copy:
     - empty: "Add a CV in Vault before running."
     - bad extract: "Your active CV has no readable text. Pick another or re-upload in Vault."
     Keep existing disable rules for active runs.
5. Never call /documents/{id}/text.

INVARIANTS:
- Metadata only; no CV body in state
- No secrets; no job-board fetches
- Empty POST still works when cvId is null (list failed)

CHECKS:
- cd frontend && npm run build
- Prefer a small vitest if already wired; otherwise build is enough for slice A

DONE WHEN: types + context fields exist; start() sends {cv} when cvId set; build passes.

RETURN: summary, invariant self-review, check output, risks/flags for cloud. Do not commit.
