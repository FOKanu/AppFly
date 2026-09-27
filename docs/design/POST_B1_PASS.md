# Post-B1 UI pass: real stage and live counts

Status: READY FOR GROK
Owner: Claude (UI design). Consumer: Grok, for local-coder briefs.
Baseline: `integrate/prototype-v1` @ `7751b2d` (B1 #35, B2 + B3 #34 merged; B4 not yet).
Parent spec: [UI_WAVES_1_2.md](UI_WAVES_1_2.md) (compatibility rule pass 1, "Post-B1 UI pass: extra rules",
H1, D2, D4, C6). Where this doc and the parent disagree, this doc wins.

Constraints: D-6 (no vitest, no new test files, no `package.json` / lockfile changes). Gate:
`npm run build` plus stub-API screenshots (section 7).

---

## 0. What B1 gives the UI (as merged)

| Field | Where | Meaning for the UI |
| --- | --- | --- |
| `stage` | `GET /runs/{id}`, `GET /runs` rows | `scout` / `match` / `write` **only while `status` is `running`**, announced when the stage starts (so earlier stages are finished). `null` when queued, at every end status, and for rows read back from the store (including interrupted). Unchanged while a cancel is pending. |
| `scouted` | both (`counts.scouted` on rows) | Set after scout finishes. Reads `0` until then. |
| `shortlisted`, `skipped` | `GET /runs/{id}` (`counts.matched` on rows; rows have no `skipped`) | Set after match finishes. `0` until then. |
| `written`, `write_skipped` | `GET /runs/{id}` (`counts.written` on rows; rows have no `write_skipped`) | Updated after each letter attempt. A failed letter doesn't raise `written`. `write_skipped` = shortlisted jobs the writer passed over because they already have a letter or are opted out of Gemini (`letters.py:61-69`). **It is not a local-model fallback.** |
| `write_cap` | `GET /runs/{id}` only | The configured letter cap for runs this server process started; `null` after a restart. A cap, not a candidate count. |
| status | both | B2: `completed_with_errors` exists, and `failed` now means the pipeline **crashed**. B3: `interrupted: true` on stale rows (status stays `failed`). |

Errors still arrive only at the end. Progress is persisted as it happens, so an interrupted run
keeps what it reached.

**Regression already on integrate.** `countsFor` (`shared/run/format.ts`, "B1 detection") treats any
defined `stage` as live. B1 sends `stage: null` for queued runs, so today a queued run shows
`scout 0 · match 0 · write 0` in the RunningBar, and so does the scout phase. P1 fixes this first.

---

## 1. The dash-or-zero rule (one helper, used everywhere)

New file `frontend/src/shared/run/progress.ts`, exporting one function:

```ts
knownCounts(input: { status: string; stage: string | null | undefined; interrupted?: boolean;
                     scouted?: number; shortlisted?: number; written?: number })
  => { scouted: boolean; shortlisted: boolean; written: boolean }
```

A count that isn't known renders as `—` (or `undefined` in data), never `0`. `skipped` follows
`shortlisted`; `write_skipped` follows `written`.

| Status / stage | scouted | shortlisted, skipped | written, write_skipped |
| --- | --- | --- | --- |
| `queued` | — | — | — |
| `running`, `stage` null (the moment before the first announcement, or an older API) | — | — | — |
| `running`, `scout` | — | — | — |
| `running`, `match` | known | — | — |
| `running`, `write` | known | known | known (`0` at write start is a real "none yet") |
| a cancel pending (UI `cancelling`) | as its `stage` above | | |
| `completed`, `completed_with_errors`, `cancelled` | known | known | known |
| `failed` (crash) or `interrupted` | **Trailing-zero rule:** stages run in order, so a count is known if it, or any later count, is `> 0`. A `0` after the last non-zero count is unknown (the run may never have reached that stage). All zero: every count is unknown. | | |
| day note (no `counts`) | — | — | — |

Callers (P1, P4, P5): `useRunController` / `format.ts` for the chrome and Workflow, Tonight
`runFromRow` and `liveRun`, Activity `normalizeRun`. Each deletes its own fallback (section 4).

---

## 2. Per-state behaviour and copy

`{id5}`, `{Who}`, `{elapsed}`, `{e}`, `{firstError}` as in the parent spec, section 4. Stage words:
`scout` → `scouting`, `match` → `matching`, `write` → `writing letters ({w} written, cap {cap})`,
or `writing letters ({w} written)` when `write_cap` is null.

### 2a. Chrome (RunningBar message, header pill) and Workflow (H1)

| State | RunningBar message | Workflow step lit / big label |
| --- | --- | --- |
| queued | `{Who} #{id5} queued…` | `waking` / `waking` |
| running, stage null | `{Who} #{id5} running · {elapsed}` | none / `running` |
| running, scout | `{Who} #{id5} running · scouting · {elapsed}` | `hunting` / `hunting` |
| running, match | `{Who} #{id5} running · matching · {elapsed}` | `matching` / `matching` |
| running, write | `{Who} #{id5} running · writing letters (2 written, cap 5) · {elapsed}` | `writing` / `writing` |
| after 60 s | append ` · long runs are normal while letters are written` **only when `stage` is `write` or null** | unchanged |
| stopping | `Stopping run #{id5}… finishing the current step`. With `stage` `write`: `Stopping run #{id5}… finishing the current letter` | the stage's step stays lit / `stopping` |
| stopping > 30 s | append ` · the current letter is still being written` **only when `stage` is `write`** | unchanged |
| completed (`w > 0`) / completed, no drafts | unchanged (parent section 4) | `waiting-for-you` / `asleep` |
| `completed_with_errors` | `Run #{id5} finished with problems: {w} draft(s) written, {e} error(s). See Activity.` | `waiting-for-you` |
| `cancelled` | `Run #{id5} stopped. Scouted {s}, shortlisted {m}, wrote {w} before stopping.` | `asleep` |
| `failed` (crash) | `Run #{id5} failed: {firstError}. See Activity for all {e} error(s).` | `error` |
| interrupted | section 6 sentence + ` Got as far as: scouted {s}, shortlisted {m}, wrote {w}.` listing **only known counts** (section 1), for example `Got as far as: scouted 12, shortlisted 4.`; omit the sentence when none is known | `error` |

`useRun()` gains `stage: "scout" | "match" | "write" | null` (from the last poll; `null` when not
running). H1's "running without stage" row stays as the stage-null case.

RunningBar fields (G12): counts via section 1; `write` shows `{w}/{cap} cap` when `write_cap` is
known, else `{w}`.

### 2b. Tonight (D2) during a run

| State | Scout | Match | Write | Vault | Kicker |
| --- | --- | --- | --- | --- | --- |
| queued | `queued` | `queued` | `queued` | `queued` | `Tonight · run #{id5} queued` |
| running, stage null | `in flight` | `in flight` | `in flight` | `queued` | `… in flight` |
| running, scout | `running` | `queued` | `queued` | `queued` | `… in flight` |
| running, match | `done` | `running` | `queued` | `queued` | `… in flight` |
| running, write | `done` | `done` | `running` | `queued` | `… in flight` |
| stopping | as its stage | | | | `… stopping` |
| lost contact | as the last known stage | | | | `… · lost contact` |

Counts in the hero lead and the cards follow section 1 (`so far` stays while active). End states
keep D5 (done / stopped / failed on all three stages).

### 2c. Activity (C1, C2)

- Row counts via section 1, including running rows. The row's `stage` is there; rows have no `skipped` / `write_skipped`, so those stay unknown.
- Chip: remove the B2 fallback. `failed` is always `failed` (danger). `completed` with `write_skipped > 0` reads `ok`; there is no fallback path, so the `fallback` chip goes.
- A live run row's chip reads `running`. Activity doesn't poll, so the counts are as of page load (C6 reload after the run stays).

---

## 3. Items from the parent spec, placed

| # | Item | Where |
| --- | --- | --- |
| 1 | H1 per-stage lighting | P3 (needs P1's `useRun().stage`) |
| 2 | D2 earlier stages `done` | P4 |
| 3 | Poll 404 → idle + toast `That run is no longer known to the API.`; other 4xx the same; 5xx keeps polling at the current interval and doesn't count toward `lost contact` | P2 |
| 4 | Re-hydrate on reconnect: when connectivity goes `disconnected` → `connected`, re-run `hydrate` once | P2 |
| 5 | Workflow snapshot refresh (`useWorkflow().reload()`) when `useRun().ui` leaves an active state | P3 |
| 6 | Tonight snapshot refresh (D4, `useTonight().reload()`), same trigger | P4 |
| 7 | Delete the dash-count fallbacks, use section 1 | P1, P4, P5 |
| 8 | Rate-limit banner: rebuild `GeminiRateLimitBanner` from the shared `Banner` (tone `warning`, title `Gemini rate-limited`) and shared `Button` (`variant="quiet"`, `Run again`, disabled / title from `useRun()`). **No new CSS.** Copy unchanged (H5) | P3 |

---

## 4. Fallbacks deleted in this pass (compatibility rule, pass 1)

- `format.ts` `uiFromStatus`: `failed` with `written > 0` → `problems`. **Delete**; `failed` → `failed`.
- `format.ts` `isInterrupted`: the `interrupted:` error-prefix test. **Delete**; read `interrupted === true` only.
- `format.ts` `countsFor` (`stage !== undefined` = live). Replace with section 1.
- Activity `outcomeOf`: the same B2 fallback. **Delete.** Activity `normalizeRun` `countsUnknown`: replace with section 1.
- Tonight `runFromRow` `unknown` (running / interrupted): replace with section 1.

**Kept until B4:** the `async:` re-attach filter and the disabled Stop for runs started outside
the app. **Kept on purpose:** the stage-null running look (section 2), which is a real state.

---

## 5. Cheap M7 folds (ride along; each is one line or one rule)

| Fold | File | Change |
| --- | --- | --- |
| Write-skipped wording | `activity/ActivityPage.tsx` (log), `activity/RunRow.tsx` (metrics) | `wrote {w} letters, {n} skipped (already written or opted out)`; metrics `write {w}` + ` ({n} skipped)` when known. No `fell back to local`, no `fallback`. Mock data keeps its numbers. |
| Day-note log line | `activity/ActivityPage.tsx` | drop the trailing ` · —` when the model is unknown (as for run rows) |
| RunList copy | `activity/RunList.tsx` | kicker `Runs`; empty `No runs yet. Runs started here, from the CLI or overnight appear in this list.` |
| Tonight funnel label | `tonight/LastRunSummary.tsx` | `Funnel · 30 days` → `Funnel · last run` (it is one run's counts) |
| Tonight notes row | `tonight/TonightPage.tsx` | `vaultNotes` → `undefined` (renders `—`); the shortlist length isn't a notes count |
| `homeUpdated` comment | `tonight/PipelineOrganism.tsx` | `Home.md reads "updated" only after a run the pipeline returned from normally (or a day note).` |
| Workflow README | `workflow/README.md:13` (a table row) | second cell becomes `Gemini 429 (preview fixture only). **Run again** starts a new full run through the shared run controller; no scraping.` |
| Offline banner gap | `shared/ui/OfflineBanner.module.css` | bottom margin on the stack equal to the page section gap (F2 item) |

**Not folded** (they need a decision or a loader change, so they stay M7 / F2): the inert
`Last run / Live / 7 nights` switcher, Workflow's hard-coded SchedulePanel plan, `next nightly 02:00`,
the mock-fallback loaders and their `Sample data` labels, the Queue / Packet fetch timeouts.

---

## 6. Briefs and PRs

Two PRs, six briefs. PR A lands first; PR B depends on P1.

| Brief | PR / branch | Files (ALLOWED) | Content |
| --- | --- | --- | --- |
| P1 | A `feat/ui-post-b1-run` | new `shared/run/progress.ts`; `shared/run/{format,types,RunContext,useRunController}.ts` | Section 1 helper; `useRun().stage`; stage words and the write-cap copy; the 60 s / 30 s suffix gating; interrupted `Got as far as`; the section 4 deletions in `format.ts`; RunningBar `write` field via `app/layout/AppShell.tsx` telemetry (one line) |
| P2 | A | `shared/run/useRunController.ts`, `app/layout/AppShell.tsx` | Items 3 and 4 |
| P3 | A | `features/workflow/{WorkflowPage,GeminiRateLimitBanner}.tsx`, `features/workflow/useWorkflow.ts`, `features/workflow/README.md` | Items 1, 5, 8; README fold |
| P4 | B `feat/ui-post-b1-pages` | `features/tonight/{TonightPage,TonightHero,PipelineOrganism,LastRunSummary}.tsx`, `features/tonight/{api,useTonight}.ts` | Items 2, 6, 7 (Tonight); Tonight folds |
| P5 | B | `features/activity/{ActivityPage,RunRow,RunList}.tsx`, `features/activity/api.ts` | Section 2c, item 7 (Activity); Activity folds |
| P6 | B (or its own tiny PR) | `shared/ui/OfflineBanner.module.css` | Offline banner gap |

---

## 7. Manual checks (stub API that walks the stages)

The stub needs `GET /runs/{id}` to move `queued` → `running`/`scout` → `match` → `write` (with
`written` rising and `write_cap: 5`) → an end status, plus switches for `completed_with_errors`,
`cancelled`, `failed`, interrupted rows, a poll 404, and a 5xx. Screenshots at 1440 px unless
marked; RunningBar visible in every shot.

- [ ] Queued: RunningBar `… queued…` with every count `—` (the regression fix). Tonight: four `queued` pills.
- [ ] Scout: `running · scouting`; counts all `—`; Workflow `hunting` lit; Tonight Scout `running`, others `queued`.
- [ ] Match: `running · matching`; `scout` shows a number, others `—`; Workflow `matching`; Tonight Scout `done`, Match `running`.
- [ ] Write with `write_cap: 5`: `writing letters (2 written, cap 5)`; RunningBar `write 2/5 cap`; Workflow `writing`; Tonight Scout and Match `done`, Write `running`. Also at 1023 px.
- [ ] Write after 60 s: the `long runs are normal…` suffix. Scout after 60 s (slow stub): no suffix.
- [ ] Stop during write: `Stopping run #…… finishing the current letter`; Workflow keeps `writing` lit, label `stopping`; Tonight kicker `stopping`.
- [ ] Ends: `completed` (drafts), `completed_with_errors`, `cancelled` (counts shown), `failed` with a crash error (trailing zeros as `—`). Activity chips agree; no `fallback` chip anywhere.
- [ ] Interrupted row: header `… Got as far as: scouted 12, shortlisted 4.` (write never reached). Activity row `scout 12 · match 4 · write —`.
- [ ] Poll 404: idle + `That run is no longer known to the API.` Poll 5xx for 20 s: still polling, no `Lost contact`.
- [ ] API down, then up: the banner clears and the profile, Gemini status, queue badge and Vault breadcrumb load without a reload.
- [ ] After a run ends: Workflow `last run #…` and Tonight's hero and cards show the finished run without a reload.
- [ ] `?preview=rate_limited`: the banner uses the shared Banner and Button styling.
- [ ] Folds: Activity log `…, 3 skipped (already written or opted out)`; RunList kicker `Runs`; Tonight `Funnel · last run` and `notes written —`; offline banner has a gap below it.

---

## 8. Backend notes (none block this pass)

| # | Observation | Effect on the UI | Suggested follow-up |
| --- | --- | --- | --- |
| K1 | A scout that errors still moves to match with `scouted` 0; errors arrive only at the end. | During match the UI shows `scout 0` as known. True in effect (nothing scouted); the error shows at the end. | Optional: an `error_count` that moves while running. |
| K2 | `write_cap` is the cap, not `min(cap, candidates)`. | The copy says `cap {cap}`, not `of {cap}`, so finishing below the cap reads right. | Optional: `write_candidates` for a true `{w} of {n}`. |
| K3 | List rows carry no `write_cap`, `skipped` or `write_skipped`. | Activity shows those as unknown. | None needed for this pass. |
