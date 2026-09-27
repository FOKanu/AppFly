# UI spec: prototype-v1 waves 1 and 2

Status: READY FOR GROK
Owner: Claude (UI design). Consumer: Grok, who splits this into local-coder briefs.
Baseline: `integrate/prototype-v1` @ `bd43eee`. Every file:line below was checked
against that commit. Corrections from the audit at `3eca567` (accepted by Grok, 2026-09-27)
are folded in; the frontend was unchanged between the two commits. The W1 review of PR #25
(head `b661176`) added the rulings, the Vault failure copy, the `feat/ui-packet-errors`
section and the W2-A AppShell items.

Roles are unchanged (see [MULTI_AGENT.md](../workflow/MULTI_AGENT.md)). This doc
decides copy, states and acceptance criteria. It does not prescribe code beyond
naming the files a brief will need.

**Decisions (user, 2026-09-27).** These resolve the open questions of the first draft.
The backend work they need is tracked, with its contract prompt, in
[FOLLOW_UPS.md](FOLLOW_UPS.md).

| # | Decision | Effect on this spec |
| --- | --- | --- |
| D-1 | The API reports the current **stage** and **live counts** while a run is going. | Backend task B1. The running state shows the stage and counts (section 4). |
| D-2 | Activity and the API must agree on the outcome. | Backend task B2 adds status `completed_with_errors`. The UI maps statuses 1:1 (section 4). |
| D-3 | Fetch listing is deferred. | Hidden in W1 (item 2). Reminder F1. |
| D-4 | An `interrupted` flag is required. | Backend task B3. Section 6 reads the flag. |
| D-5 | The mock-data rule for Tonight / Workflow / Activity waits for M7. | Brief W1-C dropped from this epic (item 3). Reminder F2. |
| D-6 | No `package.json` / lockfile changes, so no vitest for now. | **Manual checks are the binding gate.** Vitest cases below are kept, marked *(deferred)*. Reminder F3. |
| D-7 | The UI must see nightly and CLI runs. | Backend task B4. The UI shows every run regardless of trigger (sections 4 and 5). |

**Compatibility rule.** The UI waves must not wait for B1 to B4. Every new field is read
only if present (`stage`, live counts, `interrupted`, `trigger`, status
`completed_with_errors`). Until it lands, the UI uses the fallback noted in each section.
The fallbacks are removed in two passes:

1. **After B2, B3 and B1** (the post-B1 UI pass): the stage and live-count fallbacks (B1), the
   `failed` + `written > 0` split (B2), and the `interrupted:` error-prefix detection (B3).
2. **After B4**: the `async:` path-prefix re-attach fallback (section 5) and the disabled Stop
   for runs started outside the app (section 4).

---

## 0. Ground truth the UI must respect

| Fact (verified in code) | Where | UI consequence |
| --- | --- | --- |
| `apiFetch` throws `ApiError(message, status)`; network error, timeout and abort all become `status: 0`. The response body (FastAPI `detail`) is discarded. | `frontend/src/shared/api/client.ts:156-165` | The client must keep `detail` and tell a timeout apart from "offline" (section 1). |
| GET timeout 2.5 s, PUT 10 s, POST 60 s. | `client.ts:136` | A slow import or init can show up as a timeout, and the copy must allow for that. |
| Mutating requests without `X-AppFly: 1` → `403 {"detail":"Missing X-AppFly: 1 header"}`. A mutating request from a disallowed `Origin` → `403 {"detail":"Origin not allowed"}`. | `backend/src/jobhunt/api/security.py:64-71` | Two different 403 messages (section 1). |
| A `Host` other than `127.0.0.1` or `localhost` → `400` (Starlette `TrustedHostMiddleware`, plain-text body). | `backend/src/jobhunt/api/app.py:108` | Its own copy. |
| **In a browser, neither the origin 403 nor the host 400 is readable.** The UI (`:5173`) and the API (`:8787`) are always cross-origin (no Vite proxy). From a disallowed origin the CORS preflight returns `400 Disallowed CORS origin` with no `Access-Control-Allow-Origin`; the host 400 comes from the outermost middleware, also without CORS headers. `fetch` rejects, so both arrive as `status: 0`. The `Missing X-AppFly` 403 does carry CORS headers and is readable. | `api/app.py:100-108` (verified with `TestClient`) | `offline` gets an allow-list hint when the page origin is non-default (section 1). |
| `POST /workspace/import/obsidian` returns an import report `{source, jobs, letters, documents, runs, errors[], imported_at}`, **not** `WorkspaceStatus`. A missing folder → `404 {"detail":"Vault not found: <path>"}`. | `backend/src/jobhunt/api/routes/workspace.py:79-97`, `store/import_obsidian.py:32-41` | The frontend type is wrong (`vault/api.ts:118`). The success copy uses report counts. |
| `POST /runs` returns `{id, status:"queued", started, model}` immediately. A second POST while a run is queued or running → `409 {"detail":"A pipeline run is already active: <id>"}`. | `backend/src/jobhunt/api/routes/runs.py:119-142` | The Workflow page wrongly treats the response as a finished run (`WorkflowPage.tsx:144-158`). A 409 must attach to the active run. |
| `GET /runs/{id}` returns `status`, `started`, `finished`, counts, `errors[]`. **There is no `stage` field. Counts are written only when the run ends.** | `runs.py:46-77`, `api/runner.py:122-160` | While running, the UI cannot show a stage or live counts. Until B1 it shows elapsed time only. |
| The run ends `failed` if `errors` is non-empty, **even when letters were written** (per-letter failures from #17). | `runner.py:138-143` | The UI splits `failed` into "finished with problems" and "failed" (section 4). |
| `POST /runs/{id}/cancel` → `{cancelled:true}`, or `404` if the id is not in this process. Cancel is checked before scout, match, write and each letter. A Gemini call already in flight finishes first. | `runs.py:158-163`, `docs/API.md` Runs | "Cancelling" is a real, possibly long state. A 404 means "API restarted". |
| A stored run left `queued`/`running` by a dead process is returned as `failed` with an error starting `interrupted:`. | `runs.py:34, 89-94` | Detect by prefix and show it as its own state (section 6). |
| `GET /runs` rows carry `status`, `started_at`, `counts`, `error_count`, `path` (`async:<id>` = live in this process), but **not** the error strings. | `runs.py:97-116, 166-189` | Activity can't tell "interrupted" from "failed" in the list until B3. |
| Vitest is **not** installed and there is no `test` script. `*.test.*` files exist but don't run. The only gate is `npm run build`. | `frontend/package.json:8` | Per D-6, the manual checks are binding. Vitest cases are kept as *(deferred)* so they can be enabled later without rewriting. |
| `jobhunt run` (CLI and nightly) calls the pipeline directly and writes **no** run record, only the day note. Since #22, `jobhunt scout`, `match` and `write` also write into the configured store, with no run record and no lock. The nightly plist still points at an old checkout (`…/Job Application Automation/.venv/bin/jobhunt`). | `backend/src/jobhunt/cli.py:126-179, 187-208`, `launchd/com.jobhunt.nightly.plist:13` | The UI can't see these runs until B4 lands (B4 covers the stage commands too). |
| The local API is started with `python -m jobhunt.api` on `127.0.0.1:8787`. | `backend/src/jobhunt/api/__main__.py`, `README.md:18` | Used in the offline copy. |

**Copy encoding.** New copy uses ASCII plus the existing house characters `·` (U+00B7)
and `…` (U+2026). Briefs are piped PowerShell → WSL and non-ASCII turns into `?`,
so Grok should write them in briefs as the JS escapes `·` and `…`. No em dashes
in new copy, with one exception: `—` (U+2014) is allowed **only** as a standalone empty-value
placeholder (for example the WorkspacePanel path and the RunningBar counts), written as `\u2014`
in briefs. Never inside a sentence.

---

## 1. Shared: error classification (foundation for W1 and W2)

One helper turns any `ApiError` into a **failure kind** plus a display string. Every call
site in this spec uses it. Nothing shows raw `HTTP 4xx for /path` text.

| Kind | Rule | Copy template (`{action}` = verb phrase from the call site) |
| --- | --- | --- |
| `offline` | `status === 0` and not a timeout | `Can't reach the local API at {baseUrl}. Start it with: python -m jobhunt.api.` (always ends with the period). When `window.location.origin` is neither `http://localhost:5173` nor `http://127.0.0.1:5173`, append after that period: ` If the API is already running, this page's address ({origin}) may not be on its allow-list: open AppFly at http://localhost:5173, or add the address to APPFLY_ALLOWED_ORIGINS and restart the API.` |
| `timeout` | Our own abort timer fired | `The local API didn't answer within {seconds}s. It may still be working; refresh in a moment before trying again.` |
| `forbidden-header` | 403 and detail contains `X-AppFly` | `{action} was blocked: AppFly sent the request without its security header. This is a bug; please report it.` |
| `forbidden-origin` | 403 and detail is `Origin not allowed` (or any other 403). Not reachable from a browser (section 0); kept for non-browser callers and for any 403 other than the header one. | `{action} was blocked: this page's address ({origin}) isn't on the API's allow-list. Open AppFly at http://localhost:5173, or add the address to APPFLY_ALLOWED_ORIGINS and restart the API.` |
| `bad-host` | 400 and body mentions `host`. Not reachable from a browser (section 0); kept as above. | `The API only answers on localhost or 127.0.0.1. Set VITE_API_BASE_URL to http://127.0.0.1:8787 and reload.` |
| `not-found` | 404 | Set per call site (a 404 now means "the thing doesn't exist", never "not built yet"). A call site with no 404 sentence of its own falls back to `{action} failed: {detail}` (for example the Vault mutations: `Rename failed: Document not found`). |
| `rejected` | Any other 4xx | `{action} failed: {detail}` |
| `server` | 5xx | `{action} failed: the API hit an internal error (HTTP {status}). Check the terminal running the API, then try again.` |

State rules:

- `detail` comes from the JSON body. If `detail` is a string, use it. If it's a FastAPI 422 list, join each item's `msg` with `; `. If the body is JSON without a usable `detail`, leave it empty and fall back to `HTTP {status}`. If a **4xx** body isn't JSON (for example the plain-text `Invalid host header`), use its text as the detail, so `bad-host` can match.
- Every `detail` goes through `redactSecrets` (`features/activity/redact.ts:5`) and is cut to 160 characters with `…`.
- Never show the response body for a 5xx.
- **Timeout with a caller-passed signal.** Today a caller's `init.signal` replaces the internal one, so the timer aborts a controller nothing listens to and the request never times out (`client.ts:136-156`). Rule: always pass the **internal** controller's signal to `fetch` and keep the internal timer. If the caller passed a signal, combine them manually: when the caller's signal is already aborted, abort the internal controller at once; otherwise add an `abort` listener on the caller's signal that aborts the internal controller, and remove it in `finally`. Don't rely on `AbortSignal.any`. Set `timeout: true` only when the internal timer fired. An abort that came from the caller is **not** a timeout and shows no toast; the call site just drops the result.

Files likely touched: `frontend/src/shared/api/client.ts` (keep `detail`, add a `timeout` flag), new
`frontend/src/shared/api/errors.ts` (classifier and templates). `client.ts` is shared, so this should be its own brief, landing first.

Acceptance (manual checks in brackets are binding; the vitest form is deferred, F3):

- [ ] A mocked `fetch` rejection → kind `offline`, message contains `python -m jobhunt.api.` (with the period). [Stop the API, click Re-create folders → toast matches.] With the allow-list hint, the text reads `…python -m jobhunt.api. If the API is already running…`.
- [ ] An abort after timeout → kind `timeout`. A call with a caller-passed signal still times out at the method's limit; aborting the caller's signal gives no `timeout` flag and no toast.
- [ ] 403 `{"detail":"Missing X-AppFly: 1 header"}` → `forbidden-header`. 403 `{"detail":"Origin not allowed"}` → `forbidden-origin` (unit level only).
- [ ] [Open the UI at `http://<LAN-IP>:5173` (`npm run dev -- --host`) with the API running, click Import → the toast shows the `offline` message **plus** the allow-list hint naming `http://<LAN-IP>:5173`. At `http://localhost:5173` with the API stopped → the `offline` message with **no** hint.]
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
| 1d | `features/vault/VaultPage.tsx:203` (banner title) | `Document store not serving yet` | Removed. Offline: no Vault banner (the global banner covers it). Timeout or other failure: the banners in the state table below. |
| 1e | `features/vault/api.ts:14` (`STORE_UNAVAILABLE_NOTE`) | `The document store is not serving yet — /documents returns 404…` | **Delete the constant.** Its four uses become: `VaultPage.tsx:204` banner removed (1d); `disabledReason` on UploadZone and DocumentTable (`VaultPage.tsx:236, 271`) = `Start the local API to upload or change files.`; `disabledReason` on ProfileDocuments (`features/profiles/ProfilesPage.tsx:198`, import at `:8`) = `Start the local API to attach files.` |

ProfilesPage: only the import and the `disabledReason` change. Its `listDocuments().catch(() => undefined)`
(`ProfilesPage.tsx:83-95`) already leaves `storeLive` false on failure, so it needs no other change.
Keep the `availability` field on `VaultSnapshot` (it only ever reads `"live"` now) so
`AppShell.tsx:109-110` compiles without W1 touching AppShell.

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
| WorkspacePanel | Status failed, other kind | Head `Setup · status unknown`, then one line with the section 1 message (`{action}` = `Loading setup status`). Checklist rows show no ✓ and no action links, as for `offline` (W1 review ruling: a link implies a known state we don't have). Button enabled. |
| WorkspacePanel footer | Status loading or failed (any kind) | Only the `open the Vault` link: no job count and no ` · ` (a count would be a fake `0`). With a loaded status: `{n} job note(s) · open the Vault` as today |
| VaultPage | API live, 0 documents | Existing `FirstRun` panel (unchanged) |
| VaultPage | `listDocuments` or `getWorkspace` fails, `offline` | **No Vault banner**: the global `Local IPC disconnected` banner already says it, and two banners would repeat the same instruction. Table shows `No files to show while the API is offline.`; upload and edit disabled with the 1e reason |
| VaultPage | Fails with `timeout` | Warning banner, title `Vault not loaded`, body = section 1 `timeout` message. (Health may still pass, so the global banner may not show.) Table shows `No files to show until the API answers.` Upload and edit disabled with the 1e reason; **Refresh** stays enabled |
| VaultPage | Fails with any other kind | Danger banner, title `Vault not loaded`, body = section 1 message (`{action}` = `Loading your files`). Table shows `Your files couldn't be listed. Use Refresh to try again.` **Upload stays enabled** (the API is answering, and upload doesn't depend on the list; W1 review ruling). After a successful upload in this state, re-run the page load so the new file appears. **Refresh** stays enabled |
| VaultPage stats | Any load failure (any kind) | The Files / CVs / Credentials tiles show `—` (`Stat` takes `number \| null`), and the `{n} files` kicker reads `— files`. Never `0` for an unknown count |
| VaultPage | Upload / rename / active / delete fails | Toasts become the section 1 message with `{action}` = `Upload` / `Rename` / `Changing the active file` / `Delete` (replace `VaultPage.tsx:126, 144, 169, 185`). A 404 has no call-site sentence and uses the `not-found` fallback (`Rename failed: Document not found`) |

Also remove the fabricated 404 fallbacks:

- `getWorkspace` (`vault/api.ts:90-101`): a 404 must throw, not return fake `has_*: false`.
- `listDocuments` (`vault/api.ts:76-78`): a 404 must throw, not return `SAMPLE_DOCUMENTS`.

Files likely touched: `features/settings/WorkspacePanel.tsx`, `features/settings/ImportObsidianPanel.tsx`,
`features/vault/VaultPage.tsx`, `features/vault/api.ts`, `features/vault/types.ts` (import report
type), `features/profiles/ProfilesPage.tsx` (1e only), and `features/vault/UploadZone.tsx` /
`DocumentTable.tsx` only if the reason prop name changes.

Acceptance:

- [ ] `grep -rn "not serving yet\|STORE_UNAVAILABLE_NOTE\|SAMPLE_DOCUMENTS\|isMissingEndpoint" frontend/src` returns nothing, and `npm run build` passes (catches a missed import).
- [ ] *(deferred, F3)* vitest: `getWorkspace` / `listDocuments` reject on 404 (no sample rows, no fake status).
- [ ] *(deferred, F3)* vitest: `importObsidianVault` resolves to a report type; the success toast renders the counts.
- [ ] Manual, API up, empty store: Vault shows FirstRun, no banner. Settings checklist `{n} of 4 done`, where `{n}` equals the ✓ marks shown (a fresh `jobhunt init` config has keywords, so `1 of 4`). Re-create folders → `App data folder ready at …`.
- [ ] Manual, API stopped: Vault shows only the global `Local IPC disconnected` banner (no Vault banner) and the empty-table line, with no rows; the stat tiles read `—`. Settings head reads `status unknown (API not reachable)`, the footer shows only `open the Vault`, and the button is disabled with the 1b title. Profiles: attach is disabled with `Start the local API to attach files.`
- [ ] Manual, API hangs (a stub that accepts and never answers): Vault shows the `Vault not loaded` warning with `didn't answer within 2.5s` and the table line `No files to show until the API answers.`
- [ ] Manual, API answers 500 with a secret-looking body: Vault shows the `Vault not loaded` danger banner with `Loading your files failed: the API hit an internal error (HTTP 500)…`, the table line `Your files couldn't be listed. Use Refresh to try again.`, and an enabled upload zone. Settings shows `Setup · status unknown` plus the `Loading setup status failed: …` line. No body text appears anywhere.
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
| `features/packet/PacketSpec.tsx:114-117` | Remove the `Fetch listing` button. When `crawl_allowed` is true, render nothing in its place. Keep the `crawl-denied` note (and its `data-testid`) for false. |
| `features/packet/PacketSpec.tsx:120-121` denied note | `crawl_allowed is false. Fetch listing is hidden so deny-listed hosts are never crawled.` → `crawl_allowed is false, so AppFly never fetches this listing's host.` |
| `features/packet/PacketSpec.tsx:53-55` meta line | `allowed source · fetched via the local scout` → `allowed source · ingested by the scout` (it no longer implies an on-demand fetch). |
| `features/packet/PacketPage.tsx:93` | Remove `onFetchListing` and its prop wiring. |
| `features/queue/jobsApi.ts:153-180` | Delete `requestListingFetch`. |
| `features/queue/jobsApi.test.ts:60-73` (the `/fetch` assertion is at `:71`) | Replace with: `no code path calls /jobs/{id}/fetch`. |
| `features/packet/PacketPage.test.tsx:66-71` | Invert: `Fetch listing` is absent for allowed jobs, and `Open listing` is present. |
| `features/packet/README.md:16`, `features/queue/README.md:23` | Remove the "Fetch listing" mentions. |
| `features/packet/packet.css:189` | Delete the now-unused `.packet-spec__fetch` rule. |

Acceptance:

- [ ] `grep -rn "Fetch listing\|requestListingFetch\|onFetchListing" frontend/src --exclude='*.test.*'` returns nothing (READMEs included). Test files are excluded on purpose: the negative assertions at `PacketPage.test.tsx:58` and `QueuePage.test.tsx:65` legitimately keep the string.
- [ ] *(deferred, F3)* vitest: the Packet page for `agentur-ref-88112` has no `Fetch listing` button and has an `Open listing` link.
- [ ] Manual: open an allowed and a denied packet. Neither shows the button; the denied one still shows the policy note.

Out of scope: any `POST /jobs/{id}/fetch` route. Deferred (D-3). Reminder F1 in [FOLLOW_UPS.md](FOLLOW_UPS.md).

---

## W1 follow-up: Packet save and regenerate errors (`feat/ui-packet-errors`)

Found in the W1 review. Lands after W1, before W2 (W2 doesn't touch `PacketPage`).

**Problem.** `onSave` and `onRegenerate` in `features/packet/PacketPage.tsx` (`:91-137` on the W1
head) call `fetch` directly and, on any non-OK status, throw `new Error(await res.text())`. The
raw body, including 5xx bodies, reaches the `packet-error` banner unredacted, and neither call
has a timeout.

**Change.**

| Call | Today | New |
| --- | --- | --- |
| Save | raw `fetch` PUT `/jobs/{id}/letter` | `apiPut("/jobs/{id}/letter", { body: text })` (10 s timeout, `X-AppFly` added by the client) |
| Regenerate | raw `fetch` POST `/jobs/{id}/letter/regenerate` | `apiPost("/jobs/{id}/letter/regenerate")` (60 s timeout) |
| Both, on failure | `setError(err.message)` | `setError(describeApiError(error, action, notFound).message)`; if the failure is `aborted`, set nothing |
| Both, at start | error from an earlier attempt stays | `setError(null)` before the request |

Copy (section 1 templates, so offline / timeout / 5xx wording is shared):

| Call | `{action}` | 404 sentence (`notFound`) |
| --- | --- | --- |
| Save | `Saving the letter` | `This job is no longer in the store. Go back to Queue and refresh.` |
| Regenerate | `Regenerating the letter` | same |

The regenerate route turns a writer `RuntimeError` into `400 {detail}` (`routes/jobs.py:106-109`), so
a missing key reads `Regenerating the letter failed: Gemini API key is not set. Save it in Settings (Keychain entry 'gemini') or set GEMINI_API_KEY.`
Unchanged: the success feedback (`Letter saved to the local store.`, `Letter regenerated.`), the
mock-mode messages, the banner element and its `data-testid="packet-error"`.

ALLOWED FILES: `features/packet/PacketPage.tsx` only.

Acceptance:

- [ ] `grep -n "res.text()" frontend/src/features/packet/PacketPage.tsx` returns nothing.
- [ ] `npm run build` passes; no change to `package.json` or the lockfile.
- [ ] Manual, stub API answering 500 with body `{"detail":"GEMINI_API_KEY=AIza-secret"}`: Save → banner `Saving the letter failed: the API hit an internal error (HTTP 500). Check the terminal running the API, then try again.` No body text.
- [ ] Manual, real API with no Gemini key: Regenerate → the 400 message above.
- [ ] Manual, API stopped after the packet loaded: Save → the section 1 `offline` message.
- [ ] Manual: a failed Save followed by a successful Save clears the error banner.

Out of scope: the load path (`getJob`, the letter GET at `PacketPage.tsx:46`), the status PATCH
through `patchJobStatus`, and the `Sample packet` banner. All go to M7 with F2.

---

## W1 item 3: when sample / mock data may appear

**Rule:** sample data appears **only** when the failure kind is `offline` or `timeout`. An HTTP
response of any status proves the API is up, so the screen shows an error state and never
samples. Where samples appear, they are always labelled.

| Screen | Samples when offline? | Violations today |
| --- | --- | --- |
| Vault | **No, never.** Sample files in a vault read as the user's own files. | `vault/api.ts:17-59, 76-78` (fixed in item 1) |
| Tonight | Yes, labelled | `features/tonight/api.ts:14-19`: any non-OK becomes mock. **Fix deferred to M7 (D-5, F2).** |
| Workflow | Yes, labelled | `features/workflow/api.ts:10-16`: same. **Deferred to M7 (D-5, F2).** |
| Activity | Yes, labelled | Banner exists (`ActivityPage.tsx:56-59`). Loader check **deferred to M7 (D-5, F2).** |
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

In this epic: the rule is **defined** here and applied to Vault (item 1) and the global
`OfflineBanner` copy. The Tonight / Workflow / Activity loaders keep today's behaviour until M7.

Files likely touched in this epic: `shared/ui/OfflineBanner.tsx` only.

Acceptance:

- [ ] *(deferred, F3)* vitest per loader: a `fetch` rejection gives `source: "mock"`. A 500 response gives an error result, **not** mock.
- [ ] Manual, API stopped: the global banners show the new copy (no "Obsidian"). Vault shows no sample rows.
- [ ] *(M7, F2)* Manual, API up but `/runs` forced to 500: Tonight shows `Couldn't load Tonight`, with no sample rows.

Out of scope: rewriting the mock fixtures, the Tonight / Workflow / Activity loaders, and Memory ledgers (all M7).

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
| running | Latest poll `status: "running"` | `running` | `{Who} #{id5} running · {stage} · {elapsed}`. Fallback until B1: `{Who} #{id5} running · {elapsed}` | disabled | enabled |
| cancelling | `POST /cancel` returned 200, run not yet terminal | `running` | `Stopping run #{id5}… finishing the current step` | disabled | disabled, label `Stopping…` |
| cancelled | Poll `status: "cancelled"` | `stopped` | `Run #{id5} stopped. Scouted {s}, shortlisted {m}, wrote {w} before stopping.` | enabled | disabled |
| completed | `completed` and `written > 0` | `waiting-for-you` | `Run #{id5} done. {w} draft(s) to review in Queue.` | enabled | disabled |
| completed, nothing new | `completed` and `written === 0` | `idle` | `Run #{id5} done. Scouted {s}, shortlisted {m}; no new drafts.` | enabled | disabled |
| finished with problems | `status: "completed_with_errors"` (B2). Fallback until B2: `failed`, `written > 0`, not interrupted | `waiting-for-you` | `Run #{id5} finished with problems: {w} draft(s) written, {e} error(s). See Activity.` | enabled | disabled |
| failed | `status: "failed"` and not interrupted. Fallback until B2: also requires `written === 0` | `stopped` | `Run #{id5} failed: {firstError}. See Activity for all {e} error(s).` | enabled | disabled |
| interrupted | Section 6 | `stopped` | See section 6 | enabled | disabled |
| already active (409) | `POST /runs` → 409 | `running` | Toast `A run is already in progress (#{id5}). Showing its progress.`, then attach to that id as queued/running | disabled | enabled |
| run from elsewhere | Active run with `trigger` `nightly` or `cli` (B4), found by re-attach (section 5) | `running` | Same lines as queued / running, with `{Who}` = `Nightly run` or `CLI run`; toast on first sight: `A {nightly \| CLI} run started outside this page. Showing its progress.` | disabled | enabled once B4 supports cross-process cancel; until then disabled, title `This run was started outside the app and can't be stopped from here yet.` |
| lost contact | 3 polls in a row fail with `offline`/`timeout` | `stopped` | `Lost contact with the local API. Run #{id5} may still be going; retrying…` | disabled | disabled |

Formatting:

- `{Who}` = `Run` for runs started in the UI (`trigger: "api"` or no `trigger`), `Nightly run` or `CLI run` otherwise (B4).
- `{stage}` = `scouting`, `matching` or `writing letters ({w} of {cap})` from `stage` (B1); `{cap}` omitted when unknown.
- `{id5}` = last 5 characters of the run id, which matches `WorkflowPage.tsx:255`.
- `{elapsed}` = now minus the server's `started`, formatted like the RunningBar window (`45s`, `3m12s`, `1h04m`), updated every second on the client.
- `{firstError}` = `errors[0]` after `redactSecrets`, cut to 120 characters with `…`.
- `{e}` = `errors.length`.
- Counts: with B1, the RunningBar scout / match / write fields update on every poll. Before B1 (fallback), they show `—` while running, never `0`, because they're unknown, not zero.

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
`app/layout/RunningBar.tsx`, `app/layout/ControlHeader.tsx` (Stop label and button titles, G6),
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

Acceptance for B1 / B2 / B4 fields (run once those backend tasks land):

- [ ] Manual: during a run the header reads `Run #… running · matching · 1m03s` and the RunningBar counts move.
- [ ] Manual: a run with one failing letter and one written draft ends `finished with problems`, and the Activity row shows the same outcome.
- [ ] Manual: start `jobhunt run` in a terminal with the UI open → within 5 s the header shows `CLI run #… running`. Run now is disabled; a `POST /runs` returns 409.

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
| Header line | The running line from section 4, followed by ` · long runs are normal while letters are written` |
| RunningBar `run` field | Becomes a link to `/activity` (`ROUTES.activity`), text `run #{id5}` |
| Workflow HeartbeatPanel detail | `run #{id5} in flight · {elapsed}` + link `Watch in Activity →` |

Re-attach: when AppShell mounts and the API is reachable, it reads `GET /runs`. If a row has
`status` `queued`/`running` and is not interrupted, the UI attaches to that id (same as 409).
Fallback until B4: only rows whose `path` starts with `async:`.
While idle, AppShell re-reads `GET /runs` every 30 s (visible tab only), so a nightly or CLI run
that starts later is picked up within 30 s (D-7).
Navigating or reloading must never lose a live run.

Acceptance:

- [ ] *(deferred, F3)* vitest, fake timers: after 60 s the poll gap is 5 s. With 20 minutes of `running`, polling never stops and no `timed out` text appears.
- [ ] 3 rejected polls → `Lost contact…`; the 4th returns `running` → back to `running`.
- [ ] `grep -n "timed out" frontend/src` returns nothing.
- [ ] Manual: start a run, reload the page mid-run → the header shows the same run id still running.
- [ ] Manual (after B4): with the UI idle, start `jobhunt run` in a terminal → within 30 s the header shows `CLI run #… running`.

Out of scope: server push (SSE / WebSocket), and notifications.

---

## W2 item 6: interrupted runs after an API restart

**Detection:** `interrupted === true` on `GET /runs/{id}` and on `GET /runs` rows (B3).
Fallback until B3: `status === "failed"` and any `errors[i]` starts with `interrupted:`.
This takes priority over "finished with problems" and "failed".

| Surface | Copy |
| --- | --- |
| Header / RunningBar (LED `stopped`) | `{Who} #{id5} was interrupted: the process running it stopped before it finished. Check Queue for any drafts it saved, then start a new run.` |
| Workflow HeartbeatPanel detail | `run #{id5} interrupted · the process stopped mid-run` |
| Activity row (display only) | Status chip `interrupted` (neutral tone, not danger) when the row has `interrupted: true` (B3). Before B3 the row shows `failed`, which is accurate. |

When it's reached:

- On re-attach at load (section 5), when the row is no longer live and `GET /runs/{id}` returns the interrupted shape.
- After a cancel 404 (section 4).
- When `lost contact` recovers and the run now reads interrupted.

Counts: with B1 (counts saved as the run goes) show `Got as far as: scouted {s}, shortlisted {m}, wrote {w}.` Without B1, show no counts; they're stored only at run end and would read 0.

Acceptance:

- [ ] *(deferred, F3)* vitest: a `GET /runs/{id}` with `status: "failed"`, `errors: ["interrupted: the server stopped before this run finished"]` renders the interrupted copy, with no counts and no `failed:` wording.
- [ ] Manual: Run now, kill the API during scout, restart it → within 5 s of the API returning, the header shows the interrupted message. Run now is enabled and works.

Out of scope: automatic resume of interrupted runs.

---

## W2-A also: AppShell connectivity truth

Found in the W1 browser review. W2-A owns `AppShell.tsx`, so these ride along with it.

| # | Problem (on `integrate` @ `80164ee`) | Change |
| --- | --- | --- |
| A1 | `hydrate` loads `/health`, `/settings` and `/jobs` in one `Promise.all` and sets `apiReachable = false` when **any** of them throws (`AppShell.tsx:83-115`). A 500 on `/settings` makes the global banner say `This page can't reach the local API…` while the Vault page, on the same screen, says `internal error (HTTP 500)`. | Reachability comes from `/health` alone, classified with `describeApiError`: `offline`/`timeout` → disconnected; any HTTP response → connected. A failing `/settings` or `/jobs` must not flip reachability. They leave their own fields at the unknown value (`—`). |
| A2 | `apiReachable` starts `false` (`AppShell.tsx:60`), so the `Local IPC disconnected` banner flashes on every page load before `/health` answers. | Tri-state: `unknown` until the first `/health` result. The banner shows only for `disconnected`, never for `unknown`. |
| A3 | The Vault breadcrumb reads `Vault · 0 files` when the document list failed (`documentCount` starts at `0`, `AppShell.tsx:63`; rendered at `app/nav-config.ts:116`). | `documentCount: number \| null`, `null` until a live list returns. While `null`, the breadcrumb reads just `Vault`. |
| A4 | `hydrate` runs once on mount (`AppShell.tsx:118`); nothing re-checks `/health`. If the API stops or starts mid-session, the global banner stays wrong until a reload. | Re-check `/health` on the same 30 s idle cycle as the `GET /runs` re-read (section 5, visible tab only) and during a run on every poll. A recovered API clears the banner without a reload. |

Acceptance:

- [ ] Manual, stub API with `/health` OK and 500 everywhere else: no `Local IPC disconnected` banner; the Vault page shows its own `Vault not loaded` danger banner; the breadcrumb reads `Vault`.
- [ ] Manual, API up: reload any page several times; the disconnected banner never flashes.
- [ ] Manual, API up, then stopped with the UI open: the disconnected banner appears within 30 s. Start it again: the banner clears within 30 s, no reload.

---

## W2-A brief readiness: rules the brief needs

Audit of sections 4 to 6 and A1 to A4 against `integrate` @ `a8b329c`. G1 to G6 would block a
brief: the coder would have to invent behaviour. G7 to G12 fill in details. Each rule is Claude's
recommendation; **Grok confirms or overrides** before briefing.

| # | Gap in the spec | Rule |
| --- | --- | --- |
| G1 | **The run message has no visible home.** The Heartbeat pill renders only the state word (`running`); its `message` is a tooltip and `aria-label` (`Heartbeat.tsx:21-33`). RunningBar prints the state word and fields, no message (`RunningBar.tsx:30-64`). Every copy line in sections 4 to 6 would be invisible. | **The message goes in RunningBar**, as a new field right after the state LED. It takes the flexible space (replacing `running-bar__spacer`), one line, with an ellipsis and the full text in `title`. The pill is unchanged: state word, `title` = message. Below 1024 px the bar already scrolls horizontally (`index.css:613-617`); keep that. |
| G1a | RunningBar is `role="status" aria-live="polite"`. A message with a ticking `{elapsed}` would be announced every second. | Move `aria-live` off the bar onto a visually hidden span that holds the message **without** `{elapsed}` and changes only on a UI state change (section 4 table rows). The visible field keeps the ticking text. |
| G2 | `POST /runs` failures aren't in the state table. | `starting` → on `offline`, `rejected` or `server`: back to `idle`, toast = section 1 message with `{action}` = `Starting the run`. On `timeout` (60 s): the run may have started, so read `GET /runs` once. Attach if an active row exists, otherwise `idle` with the timeout toast. |
| G3 | The 409 says "attach to that id" but not how to get it. | Take the id from `ApiError.detail` (W1-A keeps it) with `/active: (\S+)$/`. If it doesn't match, read `GET /runs` and attach to the active row. If there is none: `idle`, toast `A run is already in progress, but AppFly couldn't find it. Refresh in a moment.` |
| G4 | The `R` shortcut calls `onRunNow` directly (`AppShell.tsx:173-176`) and ignores the disabled state, so it can double-POST. | `R` runs the same guarded start as the button: a no-op whenever Run now is disabled. |
| G5 | **Pause nightly is fake and clobbers run state.** It sets the LED to `paused` and toasts `Nightly schedule paused for this session.` (`AppShell.tsx:133-136`); nothing is paused. Mid-run it would overwrite `running`. | Pause nightly no longer touches the run state. Render it **disabled** with title `The nightly schedule runs from launchd; pausing it from the app isn't supported yet.` (Product rule: don't pretend a control works.) Keep the button so the header layout doesn't move. `HeartbeatState` keeps `paused` (unused) because `client.ts` isn't in W2-A's files. |
| G6 | ControlHeader has no props for the Stop label or the button titles, and the spec marked it "only if threaded". | ControlHeader **is** in scope. Add `stopLabel` (`Stop` / `Stopping…`), `stopTitle` and `runTitle`, passed straight to the buttons. |
| G7 | Run now has no disabled title. | While `starting` / `queued` / `running` / `cancelling` / `already active` / `run from elsewhere`: `A run is already in progress.` While `lost contact`: `Waiting for the local API to answer.` |
| G8 | When a terminal message goes away isn't defined. | A terminal line (`cancelled`, `completed`, `finished with problems`, `failed`, `interrupted`) stays until the next run starts or the page reloads. No auto-clear timer. The 30 s idle re-read replaces it only when it finds a new active run. After a reload with no active run the state is `idle`. |
| G9 | Leftover copy. `hydrate` sets `API live — idle`, `fallbackMessage` (`AppShell.tsx:305-318`) and the old `startPipeline` carry em-dash strings and `review drafts in the vault`, and `onStop` fakes `Run stopped`. | Delete `startPipeline`, `fallbackMessage` and the fake `onStop`. The idle line is always `Idle · no run in progress`; offline is shown by the global banner and the bar's IPC field, not the idle line. `grep -n "API live\|fallbackMessage\|timed out\|Run stopped" frontend/src/app` returns nothing. |
| G10 | The run types are too thin. `RunResponse` (`client.ts:66-73`) lacks `started`, `finished`, `skipped`, `write_skipped` and the B1 to B4 fields, and there's no type for `GET /runs` rows. `client.ts` isn't in W2-A's files. | Put the types in `shared/run/types.ts`: the `GET /runs/{id}` shape (`routes/runs.py` `AsyncRunStatus`, plus optional `stage`, `write_cap`, `interrupted`, `trigger`) and the `GET /runs` row (`RunLogSummary`: `id`, `status`, `started_at`, `counts`, `error_count`, `path`, plus optional `interrupted`, `trigger`). Leave `RunResponse` in `client.ts` alone. |
| G11 | W2-B needs a fixed interface, but the spec leaves it to Grok. | The W2-A brief must pin it, because W2-B depends on it. Recommendation: a React context provided by AppShell, read with `useRun()`, returning `{ ui, runId, message, counts, runDisabled, runTitle, stopDisabled, stopLabel, stopTitle, start(), stop() }`. `start()` and `stop()` carry every rule in sections 4 and 5, so WorkflowPage just calls them. |
| G12 | RunningBar field mapping isn't spelled out. | `run` = `#{id5}` (a link to Activity after 60 s, section 5), `window` = `{elapsed}`. scout / match / write = the counts (`—` while unknown, section 4). `write` shows `{w}/{cap}` only with `write_cap` (B1). `writer` = the run's `model` when known, else `—`. `tok` stays `—` (the API doesn't report tokens). All fields reset to `—` when a new run starts. |

Acceptance additions for W2-A:

- [ ] Manual: during a run, the RunningBar message field shows the section 4 line and truncates with an ellipsis; hovering shows the full text. The pill still shows only the state word.
- [ ] Manual (screen reader or the accessibility tree): the live region changes once per state change, not every second.
- [ ] Manual: press `R` twice quickly → exactly one `POST /runs`. Press `R` during a run → no request.
- [ ] Manual: Pause nightly is disabled with the G5 title, and clicking it never changes the LED.
- [ ] Manual, API stopped: Run now → back to idle with the `Starting the run` offline toast.

---

## W2-B brief readiness: Workflow page

Audit against `integrate` @ `395f319`. Section 4's "Workflow page specifics" list what to remove
but not what the panel shows. H1 to H4 change behaviour; H5 to H7 are details.
`useRun()` as built is a superset of G11 (it adds `liveMessage`, `led`, `model`, `elapsed`,
`linkToActivity`). W2-B reads it and never calls the API for runs itself.

| # | Gap | Rule |
| --- | --- | --- |
| H1 | **HeartbeatPanel has its own seven-step vocabulary** (`asleep` … `error`, `HeartbeatPanel.tsx:5-13`), and nothing maps the shared run state onto it. Today "running" always lights `hunting`, which claims a stage the API doesn't report before B1. | Map `useRun().ui` to one active step plus the big label (`heartbeat-panel__now`). The panel takes `activeStep: HeartbeatStateName \| null` and `label: string`; `data-state` = the active step, or `hunting` when none is lit and a run is active, or `error` for lost contact. See the H1 table below. `heartbeatFor` goes; the fixture-only `rateLimited → writing` survives only while idle (H1 table). |
| H2 | **The detail line has no rules for the live states**, and today's idle line is wrong for real rows (H6). | Use the H2 table below. The link needs a new panel prop `detailLink: boolean` (= `useRun().linkToActivity`) that renders `Watch in Activity →` as a `Link` to `ROUTES.activity` after the detail text. |
| H3 | **The panel's own Run now and Stop** must behave exactly like the header's. | Run now: `start()`, `disabled = runDisabled`, `title = runTitle`. Stop: `stop()`, `disabled = stopDisabled`, `title = stopTitle`, label `Stop current run`, or `Stopping…` while `ui === "cancelling"`. The `heartbeat-panel__flight` text reads `run in flight` while a run is active, else `nothing in flight`. Delete the local `running` state, the `onRunNow` toast (`WorkflowPage.tsx:145-159`), the `stopReason` prop and the hard-coded `disabled` on Stop. |
| H4 | **The Nightly schedule switch shows a made-up value.** `nightlyOn` comes from the hard-coded `DEFAULT_PLAN` (Wednesdays), and the switch is disabled with the config note. It claims the nightly run is on. | Same product rule as G5. Replace the switch with the text `Nightly schedule · set in launchd`, with `title` = the G5 sentence. Drop `nightlyOn`, `onNightly` and `nightlyReason` from the panel's props. |
| H5 | **The rate-limit banner's Retry** (`retryGemini`, `workflow/api.ts:157-173`) posts `/runs` itself, checks for a 429 the API never sends, and calls a full run "Write stage re-queued". | Button label `Run again`, `onClick = start()`, `disabled = runDisabled`, `title = runTitle`. Body: `The last run hit Gemini's rate limit. Run again starts a new full run; nothing is fetched from job boards.` Drop the `message` prop and the busy label; the shared controller's toasts cover 409 and failures. `retryGemini` stays exported in `api.ts` but is no longer called (the dormant `api.test.ts` imports it; remove both in F3). The banner appears only with the `?preview=rate_limited` fixture, because the real API never reports `rate_limited`. |
| H6 | **The loader parses every real `GET /runs` row as a legacy day note.** Rows always carry `date`, so `runFromLog` (`workflow/api.ts:33-58`) takes the day-note branch: the id becomes the row's `path` (the data dir, or `async:<id>`), the counts become 0, and the stages become `done`. | Rows with `kind === "run"` parse as runs: `id` = `row.id`; keep the API `status` word; counts from `row.counts` (`scouted`, `matched`, `written`); anything the row doesn't carry stays unknown (`—`), never 0. Only `kind === "day_note"` rows use the day-note branch. The mock fallback rule itself is unchanged (M7). |
| H7 | **The caption isn't true.** `state machine · emitted by jobhunt CLI over IPC` (`HeartbeatPanel.tsx:105-107`); nothing is emitted over IPC. | It becomes `state · from the local API run status`. (The snapshot refresh after a run is **deferred** by Grok to the post-B1 pass; until then the idle detail after a run comes from the shared controller, which still holds the finished run, H2.) |

H1 mapping:

| `useRun().ui` | Active step | Big label |
| --- | --- | --- |
| `idle`, no run seen since load | from the latest `kind: "run"` row (H6): `completed` with `written > 0` or `completed_with_errors` → `waiting-for-you`; `failed` → `error`; otherwise `asleep` | the step name |
| `starting`, `queued` | `waking` | `waking` |
| `running` with B1 `stage` `scout` / `match` / `write` | `hunting` / `matching` / `writing` | the step name |
| `running` without `stage` (before B1) | none | `running` |
| `cancelling` | the step that was lit when Stop was pressed (none before B1) | `stopping` |
| `lost-contact` | none (the run may still be going, so not `error`) | `lost contact` |
| `idle` and the fixture `rateLimited` flag (preview only) | `writing` | `writing` |
| `completed`, `problems` | `waiting-for-you` | `waiting-for-you` |
| `completed-empty`, `cancelled` | `asleep` | `asleep` |
| `failed`, `interrupted` | `error` | `error` |

H2 detail line:

| State | Detail |
| --- | --- |
| `idle`, no run seen since load, rows exist | `last run #{id5} {word} · {w} draft(s) to review`, or `· no drafts to review` when `{w}` is 0 or unknown. `{word}`: `completed` → `done`, `completed_with_errors` → `finished with problems`, `failed` → `failed`, `cancelled` → `stopped` |
| `idle`, no `kind: "run"` rows | `no run recorded · nothing needs review` (as today) |
| `starting` | `starting a run…` |
| `queued` | `run #{id5} queued` |
| `running` | `run #{id5} in flight · {elapsed}`. After 60 s (`linkToActivity`) append the link `Watch in Activity →` to `ROUTES.activity` |
| `cancelling` | `stopping run #{id5} · finishing the current step` |
| `lost-contact` | `useRun().message` (`Lost contact with the local API. Run #… may still be going; retrying…`) |
| `interrupted` | `run #{id5} interrupted · the process stopped mid-run` (section 6) |
| any other terminal state | `useRun().message` (for terminal states it equals `liveMessage`: no elapsed time) |
| `running`, under 60 s | `run #{id5} in flight · {elapsed}`, no link (`detailLink` false) |

W2-B ALLOWED FILES: `features/workflow/{WorkflowPage,HeartbeatPanel,GeminiRateLimitBanner}.tsx`,
`features/workflow/{api,useWorkflow,types}.ts`. Not `SchedulePanel.tsx` (its made-up plan is F2 / M7).

Acceptance:

- [ ] `grep -rn "no cancel endpoint\|Run finished —\|Retry Gemini\|emitted by jobhunt CLI" frontend/src/features/workflow` returns nothing, and `grep -n "retryGemini" frontend/src/features/workflow/*.tsx` returns nothing (the export in `api.ts` stays until F3).
- [ ] Manual, API up: Run now on Workflow → the header and the panel show the same run id and state. The panel reads `waking`, then `running` with no step lit (before B1), and the detail `run #… in flight · 12s`.
- [ ] Manual: Stop current run on Workflow → `Stopping…`, then `asleep` with the stopped sentence. The header agrees.
- [ ] Manual: after the run ends, the detail shows the finished run's sentence with the same `#…` id as the header. After a reload, the idle detail reads `last run #… {word} · …`, with an id and never a path.
- [ ] Manual: the Nightly schedule control is text only, with the G5 tooltip.

---

## W2-C brief readiness: Activity run list

Audit against `395f319`. The brief was scoped "display only, no loader changes", but **the loader
drops the fields the display needs**, so C1 needs a narrow mapping change in `activity/api.ts`. The
mock fallback rule stays untouched (M7).

| # | Gap | Rule |
| --- | --- | --- |
| C1 | `normalizeRun` (`activity/api.ts:137-163`) reads top-level `scouted` / `shortlisted` / `written`, but `GET /runs` rows nest them under `counts` (`scouted`, `matched`, `written`), so every real run shows `0`. It also drops `status`, `kind` and `error_count`, and never sees `interrupted` / `trigger`. | Map `counts.scouted` / `counts.matched` / `counts.written` (keep the top-level names for the mock payload). Add `status`, `kind`, `errorCount`, and optional `interrupted` / `trigger` to `RunSummary`. Counts a row doesn't carry (`skipped`, `write_skipped`) stay unknown, not 0. |
| C2 | The outcome chip only knows `ok` / `fallback` / `error` (`RunRow.tsx:43-48`). A running or cancelled run reads `ok`. | Chip by `status`: `queued` / `running` → `running` (accent). `completed` → `ok` (or `fallback` when `writeSkipped > 0`, as today). `completed_with_errors` → `finished with problems` (warning). `failed` → `failed` (danger). `cancelled` → `stopped` (neutral). `interrupted: true` → `interrupted` (neutral), which wins over `failed`. Fallback until B2: `failed` with `written > 0` → `finished with problems`. Day-note rows keep today's logic. |
| C3 | `has_errors` + `preview` becomes a fake error line (`api.ts:141-147`); for a run row the preview is `scouted=… written=…` or the status. | For `kind: "run"` rows, never turn `preview` into an error. Show error strings only when the payload has them (mock). Otherwise, when `errorCount > 0`, one muted line: `{n} error(s)`. |
| C4 | `trigger` isn't shown. | After the id: ` · nightly run` or ` · CLI run` for `trigger` `nightly` / `cli`; nothing for `api` or no trigger. |
| C5 | The id and path are noise for run rows: a 12-hex id, and a `path` that is the data dir or `async:<id>`. | Run rows show `#{id5}`, with the full id in `title`, and no path line. Day notes keep the date id and path. |
| C6 | Activity loads once, so a run that finishes while the page is open stays `running`. The run-field link (section 5) lands here mid-run. | ActivityPage re-loads once each time `useRun().ui` moves from an active state (`starting`, `queued`, `running`, `cancelling`, `lost-contact`) to any other state. Kept in W2-C by Grok's ruling, because the run link sends the user here mid-run. |

Metrics line for a run row: `scout {s} · match {m} · write {w}`, each `—` when unknown; the
`/{cap}` and `(n fallback)` parts appear only when `write_skipped` is known.

W2-C ALLOWED FILES: `features/activity/{RunRow,RunList,ActivityPage}.tsx`, `features/activity/{types,api}.ts`
(`normalizeRun` and its helpers only).

Acceptance:

- [ ] Manual, API up with at least one finished and one running run: the finished row shows real counts and its chip; the running row reads `running`; when it finishes, the list updates without a reload.
- [ ] Manual: no run row shows a `scouted=…` line as an error, and no run row shows a filesystem path.
- [ ] *(deferred, F3)* vitest: `normalizeRuns` on a `RunLogSummary` payload maps `counts.matched` → `shortlisted`, and keeps `status`.

---

## W2-D: Tonight during a live run, and the pipeline cards

Ruled by Grok (2026-09-27): while `useRun()` reports an active run, Tonight reads the shared
controller, shows `—` counts, and never marks a stage `done`. The pipeline-card misalignment is
included. Audit against `395f319`.

Root causes found:

- The Tonight loader has the same day-note bug as H6. `runFromPayload` (`tonight/api.ts:50-77`) turns every real row into a day note, with `stages` hard-coded to `done`, counts to `0`, and the id from `path`. That is why a live run read `done` / `0 scouted` in `w2a-running-1440.png`.
- The misalignment is CSS. `.kv` is a three-column grid (`index.css:1102-1111`), and its empty `::before` (`:1113-1115`) takes the first cell. That pushes each value onto the next row's first column (`— sources`). It happens at every width; 1023 px just makes it more visible. `.kv` is used only by `PipelineOrganism`.

| # | Rule |
| --- | --- |
| D1 | **Active run** (`ui` is `starting`, `queued`, `running`, `cancelling` or `lost-contact`): Tonight takes the run from `useRun()`, not from the loader. Hero kicker `Tonight · run #{id5} in flight`, or `Tonight · run #{id5} · lost contact`. Lead `{s} scouted · {m} shortlisted · {w} letters written so far.` from `useRun().counts`, each `—` when unknown; no refusal clause while active. The title (drafts waiting) is unchanged; it comes from the jobs list. |
| D2 | **Stage pills while active.** Before B1 (no `stage`): Scout, Match and Write read `in flight` (accent, pulsing), Vault reads `queued`. After B1: the current reported stage reads `running`, stages strictly before it read `done`, and later stages read `queued` (ruled by Grok). Before B1, no stage reads `done` during a run. The same rule applies to any Workflow stage display. |
| D3 | **Card rows while active:** every count is `—` unless `useRun().counts` has it (B1). The Scout and Write notes (first error, skipped count) are hidden. |
| D4 | **After the run:** the snapshot refresh is **deferred to the post-B1 pass** (ruled by Grok, to match Workflow). Until then, once the run ends, Tonight falls back to its loaded snapshot; a reload shows the finished run. |
| D5 | **Idle and finished runs** (loader fix, as H6): `kind: "run"` rows parse as runs, with `id`, `status` and `counts` from the row; unknown counts are `—`, not 0. Stage pills from `status`: `completed` / `completed_with_errors` → `done` on all three stages; `cancelled` → `stopped` (neutral); `failed` / `interrupted` → `failed` on all three (the API doesn't say which stage failed). The Vault pill reads `done` when `written > 0`, else `idle`. Only `kind: "day_note"` rows use the day-note branch. |
| D6 | **Crawl refusals are counted only from real refusals.** Today every run error counts as a crawl-policy refusal (`TonightPage.tsx:38`), which produces `N start URL(s) refused by crawl policy`. Count only error strings that match the backend's refusal text (`refused {host}: this host forbids scraping`, `policy.py:91-93`). When the row carries no error strings (every `GET /runs` row), the count is unknown: omit the refusal clause, show `—` in the Scout `refused` row, and show `— refusals` on the Crawl policy card. |
| D7 | **Pipeline cards:** delete `.kv::before` (`index.css:1113-1115`). Each row is then `label · leader · value`, with the value at the right end of its own row, at 1440 px and at 1023 px. |
| D8 | Kicker id format: `run #{id5}`, matching the chrome (today `run 0823a`, with no `#`). |

W2-D ALLOWED FILES: `features/tonight/{TonightPage,TonightHero,PipelineOrganism}.tsx`,
`features/tonight/{api,useTonight,types}.ts`, `index.css` (delete `.kv::before` only), and
`features/tonight/tonight.css` only if the pill tone for `in flight` / `stopped` needs a rule.

Acceptance:

- [ ] Manual, 1440 and 1023: in every stage card, each value sits at the right end of its own label's row. Screenshot both widths.
- [ ] Manual, API up, during a run: the Tonight kicker reads `Tonight · run #… in flight`, the lead shows `—` counts, the Scout / Match / Write pills read `in flight`, and nothing reads `done` or `0`. Screenshot.
- [ ] Manual: after the run and a reload, the kicker reads `Tonight · run #… finished HH:MM` and the counts match Activity.
- [ ] Manual: a finished run with errors but no crawl denial shows no `refused by crawl policy` text.

---

## Post-B1 UI pass: extra rules

Added 2026-09-27 (W2-A review, ruled by Grok). They join the first fallback-removal pass
(compatibility rule, top of this doc).

- **Poll HTTP errors** (`useRunController.ts`, `tick`). A `404` on `GET /runs/{id}` means the run is unknown to the API: go to `idle`, toast `That run is no longer known to the API.` A `5xx` keeps polling at the current interval, and doesn't count toward `lost contact`. Other 4xx: treat like a 404.
- **Workflow snapshot refresh** (deferred from W2-B H7 by Grok). `useWorkflow` exposes `reload()`; WorkflowPage calls it once each time `useRun().ui` moves from an active state to any other state, so `last run #…`, drafts and the queued list update without a reload. Same trigger as W2-C C6.
- **Tonight snapshot refresh** (deferred from W2-D D4 by Grok). `useTonight` exposes `reload()`; TonightPage calls it on the same trigger, so the finished run and the new drafts appear without a reload.
- **Re-hydrate on reconnect** (`AppShell.tsx`, `hydrate`). When connectivity moves from `disconnected` to `connected`, re-run `hydrate` once, so the profile, the Gemini status, the queue badge and the Vault count load without a reload.

---

## Brief split suggestion (for Grok)

| Brief | Branch | Depends on | ALLOWED FILES (core) |
| --- | --- | --- | --- |
| W1-A errors | `feat/ui-firstrun-truth` (first commit) | none | `shared/api/client.ts`, new `shared/api/errors.ts` (no new test files until F3) |
| W1-B first-run | same branch | W1-A | `features/settings/WorkspacePanel.tsx`, `ImportObsidianPanel.tsx`, `features/vault/{VaultPage.tsx,api.ts,types.ts}`, `features/profiles/ProfilesPage.tsx` (1e only) (+ `UploadZone.tsx`, `DocumentTable.tsx` if the prop changes), `shared/ui/OfflineBanner.tsx` |
| W1-P packet | same branch, or `feat/ui-packet-no-fetch` | none | `features/packet/{PacketSpec,PacketPage,PacketPage.test}.tsx`, `features/packet/packet.css` (the unused rule only), `features/queue/jobsApi{,.test}.ts`, both READMEs |
| Packet errors | `feat/ui-packet-errors` | W1 merged; lands before W2 | `features/packet/PacketPage.tsx` only |
| W2-A run controller | `feat/ui-run-progress` | W1-A merged | `app/layout/{AppShell,RunningBar,ControlHeader}.tsx`, new `shared/run/*`, `app/nav-config.ts` (A3 only), `app/layout/Heartbeat.tsx` only if its `title` handling changes (G1 needs no change there), `index.css` (the RunningBar message field only, G1). Includes "W2-A also: AppShell connectivity truth" (A1 to A4) and "W2-A brief readiness" (G1 to G12) |
| W2-B workflow | `feat/ui-w2b-run-progress` | W2-A merged | `features/workflow/{WorkflowPage,HeartbeatPanel,GeminiRateLimitBanner}.tsx`, `features/workflow/{api,useWorkflow,types}.ts`. Rules H1 to H7 |
| W2-C activity display | same branch | W2-A | `features/activity/{RunRow,RunList,ActivityPage}.tsx`, `features/activity/types.ts`, `features/activity/api.ts` (`normalizeRun` mapping only, C1; the mock rule stays M7). Rules C1 to C6 |
| W2-D tonight | same branch | W2-A | `features/tonight/{TonightPage,TonightHero,PipelineOrganism}.tsx`, `features/tonight/{api,useTonight,types}.ts`, `index.css` (`.kv::before` only), `tonight.css` if a pill tone is needed. Rules D1 to D8 |

`AppShell.tsx` is effectively a magnet: keep W2-A as the only brief that edits it.

Backend tasks B1 to B4 are **not** part of this brief split. The local coder implements them under Grok briefs after the UI waves, in the order set in [FOLLOW_UPS.md](FOLLOW_UPS.md) ("Decisions delegated to Grok"). The UI waves don't wait for them (compatibility rule, top of this doc).

Privacy check on this spec: no CV bodies anywhere (Vault stays metadata-only). No secrets reach the
frontend (every error detail is redacted). No browser job-board fetches (item 2 removes the only
candidate path).

---

## Open questions

None left for the user. All seven were answered on 2026-09-27 (Decisions table at the top).
Follow-ups and reminders: [FOLLOW_UPS.md](FOLLOW_UPS.md).
