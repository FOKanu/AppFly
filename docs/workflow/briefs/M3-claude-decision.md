Here's the M3 spec, based on the code at `chore/docs-claude-handoff` (b58b1fe, which sits on e7843e6).

## 1. Decision

**Placement:** Put one CV picker in the AppShell `ControlHeader`, right before **Run now**. The chosen CV is stored in the shared `RunContext`. Tonight gets no picker of its own. Workflow shows a read-only line "Using: ‹label›" under its Run now in the `HeartbeatPanel`.

**Default:** Preselect `active_cv`. A different choice only lasts for the current session. Reloading, or changing the active CV in Vault, resets the picker to the active CV. Nothing is saved as "last used".

**POST body:** Send `{ cv: <id> }` whenever a CV is selected, including when it's the active one. Send no body only when the CV list couldn't be loaded.

Reasons:
1. There are four ways to start a run: the header button (`ControlHeader.tsx:89`), the `HeartbeatPanel` button (`HeartbeatPanel.tsx:92`), `GeminiRateLimitBanner` "run again", and the **R** shortcut. All four call `run.start()`, so the choice has to live in the run context. Separate pickers on each page would drift apart.
2. Defaulting to the active CV keeps the nightly/CLI runs and the UI in agreement. A saved "last used" choice would quietly differ from what Vault shows as active.
3. Always sending the id means the run uses exactly the CV the label shows, even if the active CV changes in another tab between loading the list and clicking Run now.

## 2. States table

| State | UI | Copy |
|---|---|---|
| Loading | Compact select, disabled, with a skeleton label. Run now stays enabled (no body sent). | `CV: loading…` |
| Loaded, active CV selected | Select showing the label, word count and an "active" tag | `CV: ‹label› · 812 words · active` |
| Loaded, other CV selected | Same select plus an accent dot marking the override | `CV: ‹label› · 640 words` · tooltip `For this run only. Active CV stays ‹active label›.` |
| No CVs (`kind=cv` count 0) | The select turns into a link to `/vault`. Run now is disabled (see F2). | `No CV yet — add one in Vault` · Run now title: `Add a CV in Vault before running.` |
| Offline / API down | Picker is disabled. The existing header offline state takes over; no second banner. | `CV: —` · title `Can't reach the local API.` |
| List error (API up, `/documents` fails) | Picker is disabled with a retry icon. Run now stays enabled and sends no body. | `CV: active (couldn't load list)` · retry title `Try loading CVs again` |
| Option with `extract_status` `empty` / `unsupported` / `error` | Shown in the list but not selectable, with the reason as a suffix | `‹label› — no readable text` / `— file type not supported` / `— text extraction failed` |
| Active CV has unusable extract | It's still preselected. Warning icon, Run now disabled. | Run now title: `Your active CV has no readable text. Pick another or re-upload in Vault.` |
| Run active (`runDisabled`) | Picker is locked and shows the CV this session started with | `CV: ‹label›` · title `Locked while a run is in progress.` |
| Re-attached run (nightly/CLI/reload) | Picker locked; the CV used is unknown | `CV: —` · title `Started outside this page.` (see F1) |
| POST returns 404 (the CV was deleted) | Toast, reload the list, reset to the active CV, go back to idle | `That CV is no longer in Vault. Switched back to your active CV.` |

## 3. Acceptance criteria (for Grok → 5090)

- [ ] `RunContext` exposes `cvId: string | null`, `setCvId`, `cvOptions: CvOption[]` and `cvState: "loading" | "ready" | "empty" | "error" | "offline"`.
- [ ] `CvOption` has only `id`, `label`, `word_count`, `active_cv`, `extract_status`. It has no body or text field.
- [ ] The CV list comes from `GET /documents`, filtered client-side to `kind === "cv"`. It loads when the shell mounts and again each time the picker opens. It never calls `/documents/{id}/text` or `documentText()`.
- [ ] Add `extract_status?: "ok" | "empty" | "unsupported" | "error"` to `VaultDocument` in `features/vault/types.ts`. The backend already returns it; the frontend type doesn't have it.
- [ ] Default selection is the doc with `active_cv === true`. The selection resets to active on reload and whenever the active id changes. It's never saved to localStorage.
- [ ] `start()` sends `apiPost("/runs", { cv: cvId })` when `cvId` is set, and no body when it's null (list failed).
- [ ] Every start path (header button, Workflow `HeartbeatPanel`, `GeminiRateLimitBanner`, **R** shortcut) uses the same `cvId` through `run.start()`, with no per-caller arguments.
- [ ] Options where `extract_status !== "ok"` are shown but disabled, with the suffix copy from the table.
- [ ] Run now is disabled when the selected CV isn't `ok`, or when there are no CVs. The `runTitle` copy follows the table.
- [ ] The picker is disabled while `runDisabled` is true.
- [ ] A 404 from `POST /runs` shows the toast from the table, reloads the list, resets to active and returns to `idle`. The existing 409 and timeout paths stay as they are.
- [ ] Workflow `HeartbeatPanel` shows the read-only `Using: ‹label›`. Tonight gets no new control.
- [ ] Use only the existing `Button`, tokens and `Toast`, with colours from `tokens.ts`. The select is keyboard-operable and has a visible label ("CV for this run").
- [ ] Tests: body with `{cv}` / without a body, disabled non-`ok` options, 404 reset, and a test that no `/text` request is ever made.

## 4. Privacy check

- **Pass:** The list and picker use metadata only. The label and word count come from `GET /documents`, and `VaultDocument` has no body field.
- **Pass:** The request carries only a document id. No CV text enters React state.
- **Pass:** No secrets are involved and nothing is fetched from job boards.
- **Watch:** A document `label` defaults to the uploaded filename (`uploadDocument` sets `label = file.name`). Filenames can contain the user's full name. That's acceptable for their own local UI, but the label must not go into toasts that could reach logs or telemetry, if any exist.

## 5. Flags for cloud

- **F1: The run doesn't record which CV it used.** `RunRecord` / `GET /runs` have no `cv_id`, so a re-attached run and Activity can't say which CV ran. I suggest adding `cv_id` (id only, never text) to run rows as a small backend slice before or alongside M3. Otherwise the UI shows `—` as specced.
- **F2: The backend accepts a CV with empty text.** `_resolve_run_cv_text` returns `""` for an empty or failed extraction, and `read_cv()` can also be empty when there are no CVs, so the run goes ahead with no CV. The UI block above covers the app, but the API should probably return 422 for an explicit `cv` whose `extract_status != "ok"`. Also decide whether an empty active CV blocks CLI/nightly runs. Disabling Run now when there are no CVs is a behaviour change, so please confirm.
- **F3: Mobile reflow.** The header is already tight at narrow widths. Should the picker collapse to an icon plus sheet, or move under the RunningBar? I'd pick icon plus sheet, but it needs a quick layout check against the ui-v1 mobile reflow.
- **F4: Does "just for this run" need an escape?** If users want the override to become the new active CV, that's a Vault action ("Make active"). I'd keep it out of the picker; confirm that's fine.
- **Slicing:** (a) types, RunContext state and the POST body; (b) the header picker UI and its states; (c) the Workflow read-only line, 404 handling and tests. Check in with cloud between each slice.
