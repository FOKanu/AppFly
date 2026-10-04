# Brief template (Grok -> local coder)

Use this for every local-coder task. One brief per task. The workflow it feeds is in
[LOCAL_CODER.md](LOCAL_CODER.md): brief -> audit pass -> audit check -> edit pass(es) -> gates.

Save each brief as `~/Projects/.logs/briefs/<id>/BRIEF.md` on the Mac (scratch, never
committed). `<id>` is short and unique, for example `uh1-stale-docs`.

Rules for the writer (Grok):

- Keep the whole brief under ~1,500 tokens. The coder's context is `num_ctx` 32,768 and the
  audit pass must fit in ~60 % of it (~19,000 tokens: brief + read files + repo map + answer).
- Max **2 files to edit + 1 test file** per step. More files means more steps.
- Anchors are function/component names plus line ranges at the brief's base SHA. The audit
  pass confirms or corrects them.
- Bulk work (docs rewrites, many find/replace pairs, several functions): numbered steps, each
  one function/section + one test (or one grep check for docs). One aider session per step.
- ASCII only if the brief goes through a Windows/WSL pipe; UTF-8 is fine on the Mac.
- Never put secrets, the GPU host IP, or CV text in a brief.

```text
BRIEF <id>  (base: <branch> @ <sha7>; branch: <feat|fix|chore/...>)

GOAL
<1-3 sentences: the user-facing outcome and why it matters.>

FILES IN SCOPE (anchors at <sha7>)
- <path> : <function/component/section> (L<a>-L<b>)
- <path> : ...
EDIT AT MOST: <file 1>, <file 2>   TEST: <test file or "grep check">

AUDIT SCOPE (read-only pass; read only these)
- Read: <path>[:L<a>-L<b>], <path>, <symbol in path>
- Q1 <question the audit must answer, e.g. "who calls X?">
- Q2 ...
- Q3 ... (3-5 questions)

CONTEXT BUDGET
num_ctx 32768; audit budget ~19,000 tokens; repo map 1024 (audit) / 0 (edit).
Read files total: ~<n> tokens.

STEPS (one aider edit session each; commit after each step's gate)
1. <file(s)> : <one function/section>. Test: <test name or grep>.
2. ...

ACCEPTANCE TEST (fail-then-pass)
- <test file::test name> : asserts <...>. FAILS at <sha7> because <...>; PASSES after step N.
  (docs: `rg -n '<stale string>' <files>` returns hits before, none after; `rg -n '<new string>'` hits after.)

GATES
- backend: cd backend && .venv/bin/python -m pytest -q ; ruff 0.16.10 `ruff check .` in backend/
- frontend (Node 22): cd frontend && npm test && npm run build
- all: git diff --check ; GitHub CI green on the PR

OUT OF SCOPE
- <things the coder must not touch or "improve">

CONSTRAINTS
- No package.json / lockfile / pyproject / dependency changes. No new files unless listed.
- No git commands (Grok commits). No secrets. No deny-listed hosts. policy.py unchanged.
- Keep existing exports, props and API shapes unless a step says otherwise.
- <task-specific invariant>
```

## AUDIT.md (written by the coder in the audit pass)

The audit prompt (`~/Projects/.logs/lc/AUDIT_PROMPT.md`) asks for exactly these sections:

1. **Answers** to every audit question, with file:line.
2. **Current behaviour** (3-8 bullets, file:line).
3. **Exact lines to change** per step (file:line range, current -> new).
4. **Callers and tests affected.**
5. **Test I will write first** (file, name, assertion, why it fails today).
6. **Contradictions with the brief** (or "none").

Grok checks AUDIT.md before any edit pass. If the code contradicts the brief, Grok narrows or
rewrites the brief (and may re-run the audit) instead of letting the edit pass guess.

## Edit prompt (`EDIT_<step>.md`, one per step)

```text
EDIT PASS, step <n> of BRIEF <id>. Use BRIEF.md and AUDIT.md (read-only). Edit ONLY: <files>.
1. Write/extend the test first: <test name> (it must fail on the current code).
2. Then make the smallest change in <file> that makes it pass: <one-line summary>.
Use SEARCH/REPLACE blocks with exact current text. No other files. No refactors.
```

Retry (max 3 per step). Grok saves the failing gate output as `GATE.txt` in the brief dir.

1. Audit update (ask mode, read-only): `PROMPT=RETRY_AUDIT_PROMPT.md APPEND=1 audit.sh <id> <files>`.
   The coder appends `## Retry <k>` to AUDIT.md: what the gate shows, which line is wrong, the fix.
2. Fresh edit session with `EDIT_<step>r<k>.md`:

```text
RETRY <k>/3, step <n> of BRIEF <id>. GATE.txt has the failing gate output and AUDIT.md
"## Retry <k>" has the diagnosis. Fix ONLY that, in: <files>. SEARCH/REPLACE blocks only.
```

Still failing after retry 3: split the step into smaller steps (new brief section), or, as a
logged last resort, Grok writes the change and records it in STATE.md and the PR body.
