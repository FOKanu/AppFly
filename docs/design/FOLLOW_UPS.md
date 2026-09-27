# Follow-ups from the UI waves 1-2 spec

Source: decisions of 2026-09-27 in [UI_WAVES_1_2.md](UI_WAVES_1_2.md).
Baseline: `integrate/prototype-v1` @ `bd43eee`.

> **Reminder: when `feat/ui-firstrun-truth` and `feat/ui-run-progress` have merged into
> `integrate/prototype-v1`, implement backend tasks B1 to B4 below** (you, via Cursor; prompt
> at the bottom). The UI already reads the new fields if they're present, so each task lights up
> in the UI as soon as it merges. After all four merge, remove the UI fallbacks
> (see "Compatibility rule" in the spec).

| ID | What | When | Owner |
| --- | --- | --- | --- |
| B1 | Run stage + live counts | After the UI waves | You, via Cursor |
| B2 | `completed_with_errors` status | After the UI waves | You, via Cursor |
| B3 | `interrupted` flag | After the UI waves | You, via Cursor |
| B4 | Nightly / CLI runs visible, one lock across processes | After the UI waves, **before prototype close (P7)** because D-7 says the prototype needs it | You, via Cursor |
| F1 | Fetch listing (server-side, allowed hosts only) | Post-MVP, after a policy review | Decide then |
| F2 | Mock-data rule for Tonight / Workflow / Activity loaders | M7 (`integrate/mvp-v1`) | Grok plans, local coder |
| F3 | Vitest + Testing Library + `test` script | When you allow `package.json` / lockfile changes | Composer (CI area) |
| F4 | Nightly plist points at an old checkout | With B4 | You |

---

## Backend contract (B1 to B4)

This is what the UI relies on. How to implement it is up to the implementer, within
[RULES.md](../../RULES.md).

### B1: stage and live counts

| Field | On | Meaning |
| --- | --- | --- |
| `stage` | `GET /runs/{id}`, `GET /runs` rows | `"scout"`, `"match"`, `"write"` while running; `null` when queued or finished |
| `scouted`, `shortlisted`, `skipped`, `written`, `write_skipped` | `GET /runs/{id}` (and `counts` on list rows) | Updated **while running**: scout count after scout, match counts after match, write counts after **each** letter |
| `write_cap` | `GET /runs/{id}` | The letter cap for this run (from config), or `null` |

Every change is persisted through the existing `on_update` → `upsert_run_status`, so a restart
keeps the counts reached so far.

### B2: `completed_with_errors`

| Status | When |
| --- | --- |
| `completed` | Pipeline returned, `errors` empty |
| `completed_with_errors` | Pipeline returned normally, `errors` non-empty (a failing letter, a scout source error, a crawl denial) |
| `failed` | Pipeline raised (crash), or the run was interrupted (B3) |
| `cancelled` | Unchanged |

- `ACTIVE_STATUSES` stays `queued`, `running`.
- The CLI exit code stays 1 when there are errors.
- Stored rows from before B2 are not migrated.
- Update the Statuses line in `docs/API.md`.

### B3: `interrupted`

- `interrupted: bool` on `GET /runs/{id}` and every `GET /runs` row.
- It's `true` when the run was settled as stale; status stays `failed`.
- Keep the existing `interrupted: …` error string for older clients.

### B4: nightly and CLI runs visible to the UI

| Requirement | Detail |
| --- | --- |
| Record every run | `jobhunt run` writes a run record to the native store with the same transitions as API runs (`queued` → `running` → terminal), including B1 progress |
| `trigger` field | `"api"`, `"cli"` or `"nightly"`, on `GET /runs/{id}` and list rows. `jobhunt run --trigger nightly` sets `nightly`; the default is `cli` |
| One active run across processes | API and CLI share one lock: `POST /runs` → `409` (detail includes the active id) while a CLI or nightly run is active. `jobhunt run` exits non-zero with a clear message while any run is active. The lock must release if the owning process dies |
| Liveness, not "in my RAM" | Active runs carry an owner and a heartbeat (updated at least every 10 s). A run is stale (→ B3 interrupted) only when its heartbeat is older than 60 s. **This replaces the current rule** in `routes/runs.py` (`_settle_stale`), which would otherwise mark a live CLI run as interrupted |
| Cross-process cancel | `POST /runs/{id}/cancel` works for a run owned by another process (for example a cancel request persisted in the store, checked at the same checkpoints). `404` only if the id is unknown everywhere |
| Storage scope | Native backend only. Under `storage_backend: markdown`, keep today's behaviour and document the limit |

F4: `launchd/com.jobhunt.nightly.plist:13` runs `/Users/franciskanu/Projects/Job Application Automation/.venv/bin/jobhunt`. Point it at this checkout's venv and add `--trigger nightly`. The plist is a template, so also note the edit in the README's Nightly schedule section.

---

## Reminders for the deferred items

- **F1 Fetch listing.** It was hidden in W1. If it comes back, it needs a `POST /jobs/{id}/fetch` route that calls `assert_crawl_allowed` first (fail closed), never fetches deny-listed hosts, and has a policy review before merge. The UI copy will need a new design pass; ask Claude.
- **F2 Mock-data rule (M7).** Tonight `features/tonight/api.ts:14-19`, Workflow `features/workflow/api.ts:10-16`, and the Activity loader must fall back to samples **only** on network failure or timeout, never on an HTTP error. Banner copy is in the spec, W1 item 3.
- **F3 Vitest.** Every acceptance item marked *(deferred, F3)* in the spec becomes a real test once vitest, `@testing-library/react`, `jsdom` and a `test` script exist, plus the CI step. This needs `package.json` + `package-lock.json` changes, which are currently not allowed.

---

## Cursor prompt (B1 to B4)

Paste this into Cursor. It's ASCII-only so it survives any shell pipe.

```text
You are implementing backend tasks B1-B4 for AppFly (repo FOKanu/AppFly).

Read first, and obey: RULES.md, AGENTS.md, docs/API.md, docs/STORAGE.md,
docs/design/FOLLOW_UPS.md (the contract; section "Backend contract (B1 to B4)"),
docs/design/UI_WAVES_1_2.md (what the UI does with these fields).

Branching:
- Base: integrate/prototype-v1 (git fetch; git checkout integrate/prototype-v1; git pull --ff-only).
- One concern per branch and PR, in this order, each rebased on the integrate tip before PR:
  1. feat/backend-run-outcome   (B2 completed_with_errors + B3 interrupted flag)
  2. feat/backend-run-progress  (B1 stage + live counts + write_cap)
  3. feat/backend-run-visibility (B4 CLI/nightly run records, trigger, cross-process lock,
     heartbeat-based staleness, cross-process cancel; F4 plist template + README note)
- PR into integrate/prototype-v1. Do not merge; Composer gates and merges.

Scope:
- Backend only: backend/src/jobhunt/** and backend/tests/**, plus docs/API.md (update the
  Runs section), docs/STORAGE.md if the runs table changes, launchd/ and README.md for F4,
  and one appended row per PR in docs/FEATURES.md (append-only).
- Do NOT touch frontend/**, backend/pyproject.toml, backend/uv.lock, .github/**, .env*, config.yaml.
  Use only the standard library and existing dependencies. If you believe a new dependency
  is required, stop and ask.
- If the runs table needs new columns, add a forward-only migration in store/sqlite/ that
  keeps existing rows readable. Go through the store protocol, not raw paths.

Invariants:
- Crawl deny-list untouched; policy.py fails closed.
- No secrets or CV text in run records, errors, previews, logs or GET responses.
- Existing response fields keep their names and meaning; only add fields.
- ACTIVE_STATUSES stays {queued, running}. Cancel stays cooperative; a Gemini call in
  flight may finish.
- A live CLI/nightly run must never be reported as interrupted while its heartbeat is fresh.
- The lock must release if the owning process dies (no manual cleanup needed).
- Docstrings on new functions: Purpose / Inputs / Returns / Does not.

Tests (pytest, temp dirs, conftest keychain backends, mocked LLM; no network):
- B2: errors from a normal return -> completed_with_errors; exception -> failed; no errors -> completed.
- B3: stale stored run -> status failed, interrupted true, legacy error string still present.
- B1: stage moves scout -> match -> write; counts visible via GET /runs/{id} mid-run
  (use a fake pipeline that blocks between stages); counts persisted after restart.
- B4: a run recorded by a second process (simulate with a separate store handle and heartbeat)
  -> POST /runs returns 409 with its id; GET /runs lists it with trigger cli and not interrupted;
  heartbeat older than 60 s -> interrupted; cancel via API sets the cross-process flag and the
  owner stops at the next checkpoint.

Gates before each PR (report exact commands and final lines):
  cd backend && uv run python -m pytest -q
  cd backend && uv run --with ruff ruff check <changed .py files>
  git diff --check

PR body: what changed, which contract items it covers, the exact commands run and their results,
and anything you could not verify. Do not claim anything you did not run.
```

Note: the playbooks make Composer (Cursor) the merge and CI gate, not an implementer. Running this
prompt in Cursor is your call as the human and overrides that for these four tasks. Keep the
implementing session separate from the one that gates the PRs.

## Decisions delegated to Grok (2026-09-27 06:27, user asleep)

The user delegated these calls to Grok. Where they conflict with the sections above, they win.

1. **Who implements B1-B4.** The RTX 5090 local coder implements B1-B4 under Grok briefs. The
   user does not do them in Cursor. This overrides the "You, via Cursor" owner in the table above;
   the Cursor prompt stays as a reference for the contract, not as the execution path.
2. **Order.** W1, then W2 (with the spec fallbacks), then B2 + B3, then B1, then a small UI pass
   that replaces the fallbacks with the real fields, then B4 together with F4.
3. **D-6 stands.** No vitest and no `package.json` / lockfile changes. The vitest proposal (F3)
   is parked for the user.
4. **Deferred items.** F1 is deferred until after the MVP. F2 moves to M7. F4 ships with B4.
