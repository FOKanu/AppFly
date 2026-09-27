# Local bulk packages — lessons (M2)

Evidence from `feat/backend-run-cv` (M2 optional CV on `POST /runs`), 2026-09-27.
Pinned rule: [`.cursor/rules/local-coder-bulk.mdc`](../../.cursor/rules/local-coder-bulk.mdc).
Operating model: [MULTI_AGENT.md](MULTI_AGENT.md).

## What we tried

| Try | Package strategy | Edit format | Result |
| --- | --- | --- | --- |
| **Brief v1** (`briefs/M2-run-cv.md`) | One shot: 9 ALLOWED FILES (routes, schemas, runner, pipeline, matcher, letters, new test, two docs) + several `--read` files | Aider default `diff` | Model produced many SEARCH/REPLACE blocks; **0 Applied edits**. Empty `test_run_cv.py`. Exit 0 with an essay claiming success. |
| **Brief try2** (tighter wording, same file set) | Still one bulk package across the full stack | Forced `--edit-format whole` | Model began rewriting large files; **runaway generation** (`n_gen` > 50k at ~124 t/s, context-shift). No useful tree changes. Process killed. |
| **Cloud finish** (Composer, same brief intent) | Direct edits, full pytest | n/a | Clean apply; 126 pytest pass; PR #52. |

## Why bulk failed here

1. **Diff + many large files:** qwen3-coder often wraps or drifts SEARCH context; Aider cannot apply. Confidence looks high in chat text; the tree does not move.
2. **Whole + many large files:** the model tries to emit entire modules in one response; generation length explodes and never lands clean writes.
3. **No mid-pass check-in:** try2 was a bigger hammer on the same package instead of a cloud review of try1's 0-apply signal and a smaller re-brief.
4. **Default split:** under mixed mode, cloud is available for judgment. Burning a long local runaway then implementing in cloud anyway wastes GPU time and delays the PR.

## What works better

Slice M2-style work like this (example):

1. **Slice A** — `schemas/runs.py` + `routes/runs.py` (request model + resolve + 404). Check-in.
2. **Slice B** — `runner.py` + `run_all.py` (thread `cv_text`). Check-in.
3. **Slice C** — `matcher.py` + `letters.py` (optional `cv_text`, sealed slice). Check-in.
4. **Slice D** — `tests/test_run_cv.py` + docs. Check-in → pytest → PR.

Between slices, cloud reviews diff + any local questions (method, FastAPI body semantics, store API, test capture strategy). Local models may surface useful flags; cloud decides.

## Rules of thumb

- Prefer **≤4–6 ALLOWED FILES** per Aider invocation; smaller is better for local models.
- Prefer **`diff`**; use `whole` only for a **single small new file** (e.g. empty test scaffold), never for a multi-module rewrite.
- After **0 Applied edits** or runaway: **kill, escalate, shrink** — do not enlarge the package.
- Bulk packages that *do* ship should still have **named check-in points** in the brief (after schema, after route, after pipeline, before docs).
