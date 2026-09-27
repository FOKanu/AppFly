# UI spec: prototype-v1 waves 1 and 2

Owner: Claude (UI design). Consumer: Grok, who splits this into local-coder briefs.
Baseline: `integrate/prototype-v1` @ `bd43eee`. Every file:line below was checked
against that commit.

Roles are unchanged (see [MULTI_AGENT.md](../workflow/MULTI_AGENT.md)). This doc
decides copy, states and acceptance criteria. It does not prescribe code beyond
naming the files a brief will need.

---

## 0. Ground truth the UI must respect

| Fact (verified in code) | Where | UI consequence |
| --- | --- | --- |
| `apiFetch` throws `ApiError(message, status)`; network error, timeout and abort all become `status: 0`. The response body (FastAPI `detail`) is discarded. | `frontend/src/shared/api/client.ts:156-165` | The client must keep `detail` and tell a timeout apart from "offline" (section 1). |
| GET timeout 2.5 s, PUT 10 s, POST 60 s. | `client.ts:136` | A slow import or init can show up as a timeout, and the copy must allow for that. |
| Mutating requests without `X-AppFly: 1` → `403 {"detail":"Missing X-AppFly: 1 header"}`. A mutating request from a disallowed `Origin` → `403 {"detail":"Origin not allowed"}`. | `backend/src/jobhunt/api/security.py:64-71` | Two different 403 messages (section 1). |
| A `Host` other than `127.0.0.1` or `localhost` → `400` (Starlette `TrustedHostMiddleware`, plain-text body). | `backend/src/jobhunt/api/app.py:108` | Its own copy. |
| `POST /workspace/import/obsidian` returns an import report `{source, jobs, letters, documents, runs, errors[], imported_at}`, **not** `WorkspaceStatus`. A missing folder → `404 {"detail":"Vault not found: <path>"}`. | `backend/src/jobhunt/api/routes/workspace.py:79-97`, `store/import_obsidian.py:32-41` | The frontend type is wrong (`vault/api.ts:118`). The success copy uses report counts. |
| `POST /runs` returns `{id, status:"queued", started, model}` immediately. A second POST while a run is queued or running → `409 {"detail":"A pipeline run is already active: <id>"}`. | `backend/src/jobhunt/api/routes/runs.py:119-142` | The Workflow page wrongly treats the response as a finished run (`WorkflowPage.tsx:144-158`). A 409 must attach to the active run. |
| `GET /runs/{id}` returns `status`, `started`, `finished`, counts, `errors[]`. **There is no `stage` field. Counts are written only when the run ends.** | `runs.py:46-77`, `api/runner.py:122-159` | While running, the UI cannot show a stage or live counts. It shows elapsed time only (Q1). |
| The run ends `failed` if `errors` is non-empty, **even when letters were written** (per-letter failures from #17). | `runner.py:138-143` | The UI splits `failed` into "finished with problems" and "failed" (section 4). |
| `POST /runs/{id}/cancel` → `{cancelled:true}`, or `404` if the id is not in this process. Cancel is checked before scout, match, write and each letter. A Gemini call already in flight finishes first. | `runs.py:158-163`, `docs/API.md` Runs | "Cancelling" is a real, possibly long state. A 404 means "API restarted". |
| A stored run left `queued`/`running` by a dead process is returned as `failed` with an error starting `interrupted:`. | `runs.py:34, 89-94` | Detect by prefix and show it as its own state (section 6). |
| `GET /runs` rows carry `status`, `started_at`, `counts`, `error_count`, `path` (`async:<id>` = live in this process), but **not** the error strings. | `runs.py:97-116, 166-189` | Activity can't tell "interrupted" from "failed" in the list (Q4). |
| Vitest is **not** installed and there is no `test` script. `*.test.*` files exist but don't run. The only gate is `npm run build`. | `frontend/package.json:8` | Acceptance criteria are written as vitest cases **plus** a manual check. The manual check is binding until vitest is wired (Q6). |
| The local API is started with `python -m jobhunt.api` on `127.0.0.1:8787`. | `backend/src/jobhunt/api/__main__.py`, `README.md:18` | Used in the offline copy. |

**Copy encoding.** New copy uses ASCII plus the existing house characters `·` (U+00B7)
and `…` (U+2026). Briefs are piped PowerShell → WSL and non-ASCII turns into `?`,
so Grok should write them in briefs as the JS escapes `·` and `…`. No em dashes
in new copy.

---

## 1. Shared: error classification (foundation for W1 and W2)

One helper turns any `ApiError` into a **failure kind** plus a display string. Every call
site in this spec uses it. Nothing shows raw `HTTP 4xx for /path` text.

| Kind | Rule | Copy template (`{action}` = verb phrase from the call site) |
| --- | --- | --- |
| `offline` | `status === 0` and not a timeout | `Can't reach the local API at {baseUrl}. Start it with: python -m jobhunt.api` |
| `timeout` | Our own abort timer fired | `The local API didn't answer within {seconds}s. It may still be working; refresh in a moment before trying again.` |
| `forbidden-header` | 403 and detail contains `X-AppFly` | `{action} was blocked: AppFly sent the request without its security header. This is a bug; please report it.` |
| `forbidden-origin` | 403 and detail is `Origin not allowed` (or any other 403) | `{action} was blocked: this page's address ({origin}) isn't on the API's allow-list. Open AppFly at http://localhost:5173, or add the address to APPFLY_ALLOWED_ORIGINS and restart the API.` |
| `bad-host` | 400 and body mentions `host` | `The API only answers on localhost or 127.0.0.1. Set VITE_API_BASE_URL to http://127.0.0.1:8787 and reload.` |
| `not-found` | 404 | Set per call site (a 404 now means "the thing doesn't exist", never "not built yet"). |
| `rejected` | Any other 4xx | `{action} failed: {detail}` |
| `server` | 5xx | `{action} failed: the API hit an internal error (HTTP {status}). Check the terminal running the API, then try again.` |

State rules:

- `detail` comes from the JSON body. If `detail` is a string, use it. If it's a FastAPI 422 list, join each item's `msg` with `; `. Otherwise leave it empty and fall back to `HTTP {status}`.
- Every `detail` goes through `redactSecrets` (`features/activity/redact.ts:5`) and is cut to 160 characters with `…`.
- Never show the response body for a 5xx.

Files likely touched: `frontend/src/shared/api/client.ts` (keep `detail`, add a `timeout` flag), new
`frontend/src/shared/api/errors.ts` (classifier and templates). `client.ts` is shared, so this should be its own brief, landing first.

Acceptance (vitest `shared/api/errors.test.ts`; manual in brackets):

- [ ] A mocked `fetch` rejection → kind `offline`, message contains `python -m jobhunt.api`. [Stop the API, click Re-create folders → toast matches.]
- [ ] An abort after timeout → kind `timeout`.
- [ ] 403 `{"detail":"Missing X-AppFly: 1 header"}` → `forbidden-header`. 403 `{"detail":"Origin not allowed"}` → `forbidden-origin`. [Open the UI from `http://<LAN-IP>:5173` with `--host`, click Import → the origin message shows.]
- [ ] 422 with a list `detail` → the `msg` values joined. 413 `{"detail":"File exceeds 8 MiB limit"}` → `Upload failed: File exceeds 8 MiB limit`.
- [ ] 500 with body `{"detail":"AIzaSyA...secret"}` → message contains no body text.
- [ ] A detail containing `GEMINI_API_KEY=abc` renders `[redacted]`.

---

## W1 item 1: replace the five stale strings

All five are verified to be at these lines on `bd43eee`:

| # | Location | Today | Replace with |
| --- | --- | --- | --- |
| 1a | `features/settings/WorkspacePanel.tsx:53` (init failure toast) | `Could not create the folder — POST /workspace/init is not serving yet.` | Section 1 template with `{action}` = `Creating the app data folder`. Offline / timeout / 403 / 5xx as in section 1. |
| 1b | `features/settings/WorkspacePanel.tsx:146` (disabled button title) | `POST /workspace/init is not serving yet.` | Disabled **only** when status load failed with `offline`/`timeout`: title `Start the local API first (python -m jobhunt.api).` For any other load failure the button stays enabled (it doubles as a retry). |
| 1c | `features/settings/ImportObsidianPanel.tsx:64` (import failure toast) | `Import failed — /workspace/import/obsidian is not serving yet.` | 404 → `No Obsidian vault found at {path}. Check the folder and try again.` Otherwise section 1 with `{action}` = `Import`. |
| 1d | `features/vault/VaultPage.tsx:203` (banner title) | `Document store not serving yet` | Replaced by the section 3 offline banner, or the error banner below. |
| 1e | `features/vault/api.ts:14` (`STORE_UNAVAILABLE_NOTE`) | `The document store is not serving yet — /documents returns 404…` | **Delete the constant.** Its three uses (`VaultPage.tsx:204, 236, 271`) become: banner = section 3; `disabledReason` on UploadZone and DocumentTable = `Start the local API to upload or change files.` |

Success copy (replaces the current toasts):

| Action | Current | New |
| --- | --- | --- |
| Workspace init (`WorkspacePanel.tsx:50`) | `App data folder created.` | `App data folder ready at {data_path}.` |
| Obsidian import (`ImportObsidianPanel.tsx:62`) | `Vault imported into AppFly storage.` | `Imported {jobs} jobs, {letters} letters and {documents} documents from {source}. This was a one-time copy; later edits in Obsidian won't appear here.` If `errors.length > 0`, append ` {n} item(s) were skipped; see the API terminal.` |

State rules:

| Surface | Condition | Shows |
| --- | --- | --- |
| WorkspacePanel | Status loading | Path `…`, checklist head `Setup · checking…`, all marks empty |
| WorkspacePanel | Status loaded | As today (real flags) |
| WorkspacePanel | Status failed, `offline`/`timeout` | Path `—`, head `Setup · status unknown (API not reachable)`. Checklist rows show no ✓ **and** no action links. Button disabled (1b). |
| WorkspacePanel | Status failed, other kind | Head `Setup · status unknown`, then one line with the section 1 message (`{action}` = `Loading setup status`). Button enabled. |
| VaultPage | API live, 0 documents | Existing `FirstRun` panel (unchanged) |
| VaultPage | `listDocuments` or `getWorkspace` fails, `offline`/`timeout` | Section 3 offline banner; table shows `No files to show while the API is offline.`; upload and edit disabled with 1e reason |
| VaultPage | Fails with any other kind | Danger banner, title `Vault not loaded`, body = section 1 message (`{action}` = `Loading your files`); **Refresh** stays enabled |
| VaultPage | Upload / rename / active / delete fails | Toasts become the section 1 message with `{action}` = `Upload` / `Rename` / `Changing the active file` / `Delete` (replace `VaultPage.tsx:126, 144, 169, 185`) |

Also remove the fabricated 404 fallbacks:

- `getWorkspace` (`vault/api.ts:90-101`): a 404 must throw, not return fake `has_*: false`.
- `listDocuments` (`vault/api.ts:76-78`): a 404 must throw, not return `SAMPLE_DOCUMENTS`.

Files likely touched: `features/settings/WorkspacePanel.tsx`, `features/settings/ImportObsidianPanel.tsx`,
`features/vault/VaultPage.tsx`, `features/vault/api.ts`, `features/vault/types.ts` (import report
type), and `features/vault/UploadZone.tsx` / `DocumentTable.tsx` only if the reason prop name changes.

Acceptance:

- [ ] `grep -rn "not serving yet\|STORE_UNAVAILABLE_NOTE\|SAMPLE_DOCUMENTS" frontend/src` returns nothing.
- [ ] vitest: `getWorkspace` / `listDocuments` reject on 404 (no sample rows, no fake status).
- [ ] vitest: `importObsidianVault` resolves to a report type; the success toast renders the counts.
- [ ] Manual, API up, empty store: Vault shows FirstRun, no banner. Settings checklist `0 of 4 done`. Re-create folders → `App data folder ready at …`.
- [ ] Manual, API stopped: Vault shows the offline banner and no rows. Settings head reads `status unknown (API not reachable)` and the button is disabled with the 1b title.
- [ ] Manual: import a non-existent path → `No Obsidian vault found at …`. Import a real vault → counts toast.

Out of scope: redesigning the checklist, new readiness fields, multi-profile, and the Obsidian path editor.

---

## W1 item 2: "Fetch listing" on the Packet page

**Decision: hide it for the prototype. Do not add a backend route in P3.**

Why:

1. The button calls a route that doesn't exist (`queue/jobsApi.ts:168`), so today it always fails. A button that always fails is worse than no button.
2. A server-side listing fetch is a new crawl surface. It needs a policy and security review (escalation rule 3), which is not a first-run-truth task.
3. The `Open listing` link (`PacketSpec.tsx:58-70`) already covers the user's need without AppFly fetching anything.

| Surface | Change |
| --- | --- |
| `features/packet/PacketSpec.tsx:114-117` | Remove the `Fetch listing` button. When `crawl_allowed` is true, render nothing in its place. Keep the `crawl-denied` note for false. |
| `features/packet/PacketSpec.tsx:53-55` meta line | `allowed source · fetched via the local scout` → `allowed source · ingested by the scout` (it no longer implies an on-demand fetch). |
| `features/packet/PacketPage.tsx:93` | Remove `onFetchListing` and its prop wiring. |
| `features/queue/jobsApi.ts:152-180` | Delete `requestListingFetch`. |
| `features/queue/jobsApi.test.ts:60-73` (the `/fetch` assertion is at `:71`) | Replace with: `no code path calls /jobs/{id}/fetch`. |
| `features/packet/PacketPage.test.tsx:66-71` | Invert: `Fetch listing` is absent for allowed jobs, and `Open listing` is present. |
| `features/packet/README.md:16`, `features/queue/README.md:23` | Remove the "Fetch listing" mentions. |

Acceptance:

- [ ] `grep -rn "Fetch listing\|requestListingFetch\|/fetch\`" frontend/src` returns nothing (READMEs included).
- [ ] vitest: the Packet page for `agentur-ref-88112` has no `Fetch listing` button and has an `Open listing` link.
- [ ] Manual: open an allowed and a denied packet. Neither shows the button; the denied one still shows the policy note.

Out of scope: any `POST /jobs/{id}/fetch` route. If wanted later, it's a post-MVP backend task with a policy review (Q3).

---

## W1 item 3: when sample / mock data may appear

**Rule:** sample data appears **only** when the failure kind is `offline` or `timeout`. An HTTP
response of any status proves the API is up, so the screen shows an error state and never
samples. Where samples appear, they are always labelled.

| Screen | Samples when offline? | Violations today |
| --- | --- | --- |
| Vault | **No, never.** Sample files in a vault read as the user's own files. | `vault/api.ts:17-59, 76-78` (fixed in item 1) |
| Tonight | Yes, labelled | `features/tonight/api.ts:14-19`: any non-OK becomes mock |
| Workflow | Yes, labelled | `features/workflow/api.ts:10-16`: same |
| Activity | Yes, labelled | Banner exists (`ActivityPage.tsx:56-59`). Check that its loader only falls back on network failure. |
| Queue / Packet | Yes, labelled | `usingMock` path. Reuse the banner below. |
| Memory | Per M7 | Out of scope here |

Copy:

| Element | Copy |
| --- | --- |
| Per-screen sample banner (tone `warning`, title) | `Sample data` |
| Banner body | `The local API isn't reachable, so this screen shows sample {jobs \| runs \| activity}, not yours. Start the API (python -m jobhunt.api) and refresh.` |
| Global `OfflineBanner` "You're offline" body (`shared/ui/OfflineBanner.tsx:44-45`, still names Obsidian) | `Scout and the letter writer need a network. Your files on this machine are unaffected. Nothing is submitted automatically.` |
| Global "Local IPC disconnected" body (`OfflineBanner.tsx:50-51`) | `This page can't reach the local API at {baseUrl}. Start it with python -m jobhunt.api. Never paste job-board cookies to work around this.` |
| Non-offline load failure (any screen) | Danger banner, title `Couldn't load {screen}`, body = section 1 message |

Files likely touched: `shared/ui/OfflineBanner.tsx`, `shared/ui/Banner.tsx` (only if a shared
`SampleDataBanner` is added), `features/tonight/api.ts`, `features/workflow/api.ts`, and the
Activity loader (`features/activity/api.ts`).

Acceptance:

- [ ] vitest per loader: a `fetch` rejection gives `source: "mock"`. A 500 response gives an error result, **not** mock.
- [ ] Manual, API up but `/runs` forced to 500 (for example temporarily): Tonight shows `Couldn't load Tonight`, with no sample rows.
- [ ] Manual, API stopped: every screen with samples shows the `Sample data` banner. Vault shows none.

Out of scope: rewriting the mock fixtures, and Memory ledgers (M7).
**Split note for Grok:** the Tonight / Workflow / Activity loader fixes can be a separate brief (W1-C) from the Settings / Vault work (Q5).

---

## W2 item 4: run states and Stop

A single run model feeds three surfaces: the ControlHeader heartbeat line, the RunningBar, and the
Workflow HeartbeatPanel. Today they are driven separately, and the Workflow one is wrong
(`WorkflowPage.tsx:144-158` treats `POST /runs` as the finished run). **Recommendation to
Grok:** one shared run controller (for example `frontend/src/shared/run/useRun.ts`) owned by
AppShell and read by WorkflowPage. The interface is Grok's call.

`HeartbeatState` (`client.ts:14-19`) stays the LED vocabulary. The table maps each UI state to it.

| UI state | Enters when | LED (`HeartbeatState`) | Header / RunningBar message | Run now | Stop |
| --- | --- | --- | --- | --- | --- |
| idle | No active run known | `idle` | `Idle · no run in progress` | enabled | disabled, title `No run in progress.` |
| starting | `POST /runs` sent, no reply yet | `running` | `Starting run…` | disabled | disabled |
| queued | Latest poll `status: "queued"` | `running` | `Run #{id5} queued…` | disabled | enabled |
| running | Latest poll `status: "running"` | `running` | `Run #{id5} running · {elapsed}` (stage appended as ` · {stage}` once the API provides it, Q1) | disabled | enabled |
| cancelling | `POST /cancel` returned 200, run not yet terminal | `running` | `Stopping run #{id5}… finishing the current step` | disabled | disabled, label `Stopping…` |
| cancelled | Poll `status: "cancelled"` | `stopped` | `Run #{id5} stopped. Scouted {s}, shortlisted {m}, wrote {w} before stopping.` | enabled | disabled |
| completed | `completed` and `written > 0` | `waiting-for-you` | `Run #{id5} done. {w} draft(s) to review in Queue.` | enabled | disabled |
| completed, nothing new | `completed` and `written === 0` | `idle` | `Run #{id5} done. Scouted {s}, shortlisted {m}; no new drafts.` | enabled | disabled |
| finished with problems | `failed`, `written > 0`, not interrupted | `waiting-for-you` | `Run #{id5} finished with problems: {w} draft(s) written, {e} error(s). See Activity.` | enabled | disabled |
| failed | `failed`, `written === 0`, not interrupted | `stopped` | `Run #{id5} failed: {firstError}. See Activity for all {e} error(s).` | enabled | disabled |
| interrupted | Section 6 | `stopped` | See section 6 | enabled | disabled |
| already active (409) | `POST /runs` → 409 | `running` | Toast `A run is already in progress (#{id5}). Showing its progress.`, then attach to that id as queued/running | disabled | enabled |
| lost contact | 3 polls in a row fail with `offline`/`timeout` | `stopped` | `Lost contact with the local API. Run #{id5} may still be going; retrying…` | disabled | disabled |

Formatting:

- `{id5}` = last 5 characters of the run id, which matches `WorkflowPage.tsx:255`.
- `{elapsed}` = now minus the server's `started`, formatted like the RunningBar window (`45s`, `3m12s`, `1h04m`), updated every second on the client.
- `{firstError}` = `errors[0]` after `redactSecrets`, cut to 120 characters with `…`.
- `{e}` = `errors.length`.
- Counts come from the final `GET /runs/{id}`. While running, the RunningBar count fields show `—`, never `0` (they're unknown, not zero).

Stop rules:

| Case | Behaviour | Copy |
| --- | --- | --- |
| Click Stop while queued or running | `POST /runs/{id}/cancel` → state `cancelling`. Keep polling. | none beyond the state line |
| Cancel → 404 | The API no longer has the run (restarted). Do one immediate `GET /runs/{id}` and render whatever it says (usually interrupted). | Toast: `That run is no longer active on the API. Showing its last saved status.` |
| Cancel → other error | Stay in the prior state, Stop re-enabled | Toast: section 1 message with `{action}` = `Stopping the run` |
| Final status `completed` after cancelling | Honour it | Append ` It finished before it could stop.` to the completed message |
| `cancelling` for more than 30 s | Keep polling | Append ` · the current letter is still being written` |

Workflow page specifics:

- `HeartbeatPanel.tsx:79` hard-codes `disabled` on Stop. It must follow the table.
- `stopReason` (`WorkflowPage.tsx:186`) is **removed**. The title comes from the table's Stop column.
- `heartbeatDetail` (`WorkflowPage.tsx:248-256`) reads the shared run state.
- The Workflow **Run now** uses the shared controller, and its `Run finished — scouted …` toast (`WorkflowPage.tsx:150-152`) is deleted.
- `retryGemini` (`workflow/api.ts:157-173`) also `POST /runs` (a full run, not a write-stage retry, and it checks for 429, which the API never returns). It should use the shared controller and be labelled `Run again`. Its message becomes the section 1 message or the 409 toast.

Files likely touched: `app/layout/AppShell.tsx` (run logic at `:128-140, :241-281`),
`app/layout/RunningBar.tsx`, `app/layout/ControlHeader.tsx` (only if the Stop label or title is threaded),
`features/workflow/WorkflowPage.tsx`, `features/workflow/HeartbeatPanel.tsx`, `features/workflow/api.ts`,
and the new `shared/run/*` if Grok agrees. `features/tonight/*` only if Tonight shows run state.

Acceptance (vitest with fake timers and a mocked `fetch`; manual against the local API):

- [ ] `POST /runs` → `{id:"abc123def456",status:"queued"}` → header reads `Run #ef456 queued…`, Run now disabled, Stop enabled.
- [ ] Poll `running`, 75 s elapsed → `Run #ef456 running · 1m15s`.
- [ ] Stop → exactly one `POST /runs/abc123def456/cancel` carrying `X-AppFly: 1` → `Stopping run #ef456…`, Stop disabled.
- [ ] Poll `cancelled` with counts 12/4/1 → `…stopped. Scouted 12, shortlisted 4, wrote 1 before stopping.`
- [ ] Cancel 404 → one extra `GET /runs/{id}`, then the toast from the Stop rules table.
- [ ] `POST /runs` 409 with detail `…active: 9f8e7d6c5b4a` → toast, and polling targets `9f8e7d6c5b4a`.
- [ ] `failed` with `written: 2`, `errors: ["letter x: 429", "letter y: 500"]` → `finished with problems: 2 draft(s) written, 2 error(s)`, LED `waiting-for-you`.
- [ ] `failed`, `written: 0`, `errors: ["RuntimeError: GEMINI_API_KEY=abc"]` → the message shows `[redacted]`.
- [ ] Workflow: the string `no cancel endpoint` is gone (`grep`). Stop is enabled while a run is active. Run now from Workflow shows the same states as the header.
- [ ] Manual: Run now → Stop during scout → ends `cancelled` within one checkpoint. Screenshot in the PR.

Out of scope: stage-selective runs, a CV picker (M3), a pause/resume that the API doesn't support, and killing an in-flight Gemini call.

---

## W2 item 5: long runs and polling

Replaces the 120 × 500 ms loop (`AppShell.tsx:253`) and its `Run timed out — check Activity` (`:277`). **There is no client-side timeout.**

| Phase | Poll interval |
| --- | --- |
| 0 to 60 s after `started` | 1 s |
| After 60 s | 5 s |
| Tab hidden (`document.visibilityState === "hidden"`) | 15 s, back to the phase interval when visible |
| After a failed poll | Keep the interval. After 3 failures in a row → `lost contact`; keep polling every 5 s; the first success restores the real state. |
| Terminal status | Stop polling |

| After 60 s | Copy / element |
| --- | --- |
| Header line | `Run #{id5} running · {elapsed} · long runs are normal while letters are written` |
| RunningBar `run` field | Becomes a link to `/activity` (`ROUTES.activity`), text `run #{id5}` |
| Workflow HeartbeatPanel detail | `run #{id5} in flight · {elapsed}` + link `Watch in Activity →` |

Re-attach on load: when AppShell mounts and the API is reachable, it reads `GET /runs`. If a row has
`status` `queued`/`running` and `path` starting `async:`, the UI attaches to that id (same as 409).
Navigating or reloading must never lose a live run.

Acceptance:

- [ ] vitest, fake timers: after 60 s the poll gap is 5 s. With 20 minutes of `running`, polling never stops and no `timed out` text appears.
- [ ] 3 rejected polls → `Lost contact…`; the 4th returns `running` → back to `running`.
- [ ] `grep -n "timed out" frontend/src` returns nothing.
- [ ] Manual: start a run, reload the page mid-run → the header shows the same run id still running.

Out of scope: server push (SSE / WebSocket), and notifications.

---

## W2 item 6: interrupted runs after an API restart

**Detection:** `status === "failed"` and any `errors[i]` starts with `interrupted:`. This takes
priority over "finished with problems" and "failed".

| Surface | Copy |
| --- | --- |
| Header / RunningBar (LED `stopped`) | `Run #{id5} was interrupted: the local API stopped before it finished. Check Queue for any drafts it saved, then start a new run.` |
| Workflow HeartbeatPanel detail | `run #{id5} interrupted · API restarted mid-run` |
| Activity row (display only) | Status chip `interrupted` (neutral tone, not danger), **only if** the list exposes it (Q4). Until then the row shows `failed`, which is accurate. |

When it's reached:

- On re-attach at load (section 5), when the row is no longer live and `GET /runs/{id}` returns the interrupted shape.
- After a cancel 404 (section 4).
- When `lost contact` recovers and the run now reads interrupted.

Don't show counts in this state. They're stored only at run end, so they read 0 and would mislead.

Acceptance:

- [ ] vitest: a `GET /runs/{id}` with `status: "failed"`, `errors: ["interrupted: the server stopped before this run finished"]` renders the interrupted copy, with no counts and no `failed:` wording.
- [ ] Manual: Run now, kill the API during scout, restart it → within 5 s of the API returning, the header shows the interrupted message. Run now is enabled and works.

Out of scope: automatic resume of interrupted runs.

---

## Brief split suggestion (for Grok)

| Brief | Branch | Depends on | ALLOWED FILES (core) |
| --- | --- | --- | --- |
| W1-A errors | `feat/ui-firstrun-truth` (first commit) | none | `shared/api/client.ts`, new `shared/api/errors.ts` (+ test) |
| W1-B first-run | same branch | W1-A | `features/settings/WorkspacePanel.tsx`, `ImportObsidianPanel.tsx`, `features/vault/{VaultPage.tsx,api.ts,types.ts}` (+ `UploadZone.tsx`, `DocumentTable.tsx` if the prop changes), `shared/ui/OfflineBanner.tsx` |
| W1-P packet | same branch, or `feat/ui-packet-no-fetch` | none | `features/packet/{PacketSpec,PacketPage,PacketPage.test}.tsx`, `features/queue/jobsApi{,.test}.ts`, both READMEs |
| W1-C loaders | separate (Q5) | W1-A | `features/{tonight,workflow,activity}/api.ts` (+ tests) |
| W2-A run controller | `feat/ui-run-progress` | W1-A merged | `app/layout/{AppShell,RunningBar,ControlHeader}.tsx`, new `shared/run/*` |
| W2-B workflow | same branch | W2-A | `features/workflow/{WorkflowPage,HeartbeatPanel}.tsx`, `features/workflow/api.ts` |

`AppShell.tsx` is effectively a magnet: keep W2-A as the only brief that edits it.

Privacy check on this spec: no CV bodies anywhere (Vault stays metadata-only). No secrets reach the
frontend (every error detail is redacted). No browser job-board fetches (item 2 removes the only
candidate path).

---

## Open questions (for the user)

1. **Stage while running.** The API has no `stage` field and counts only appear at the end, so "running" can show only elapsed time. Should Grok add `stage` (`scout` / `match` / `write`) and live counts to `GET /runs/{id}` (small backend task, W2)? If yes, the running line gains ` · {stage}`.
2. **"Failed" when letters were written.** The backend marks a run `failed` if any letter errored, even with drafts written. This spec shows it as "finished with problems". Would you rather the backend add a `completed_with_errors` status so Activity and the API agree?
3. **Fetch listing.** OK to drop it for the prototype and treat a server-side listing fetch as post-MVP (it needs a policy review)?
4. **Interrupted in Activity.** `GET /runs` doesn't return error strings, so Activity can't label a run "interrupted". Add an `interrupted: bool` (or the first error) to the list row?
5. **Scope of the mock-data rule.** Fix the Tonight / Workflow / Activity loaders in prototype-v1 (brief W1-C), or leave them to M7?
6. **Frontend tests.** Every criterion above has a vitest form, but vitest isn't installed. Should Grok add vitest + Testing Library and a `test` script (a `package.json` / lockfile change, Composer's CI area)? Or do manual checks stay binding for this epic?
7. **Nightly / CLI runs.** The single-run lock only covers the API process. A nightly `jobhunt run` running at the same time is invisible to the UI. Is that acceptable for the prototype?
