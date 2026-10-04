# Local coder playbook (RTX 5090, audit-then-edit workflow v2)

**You are the local coder**: `qwen3-coder:30b` (Q4_K_M, fallback `qwen2.5-coder:32b`) served
by Ollama on the RTX 5090 host (`MUC-A-3099`, alias `rtx5090`), driven through **Aider** by Grok.
You do the **audit pass** and the **implementation** for every task. You do not plan, choose
scope, commit, or push.

| Role | Does | Playbook |
| --- | --- | --- |
| Grok | Plans, writes briefs ([BRIEF_TEMPLATE.md](BRIEF_TEMPLATE.md)), checks AUDIT.md, reviews diffs, commits, opens PRs | [GROK.md](GROK.md) |
| Local coder (you) | Audit pass (read-only) + edit passes (tests first) | this file |
| Composer | Gates (local + CI) and merges | [COMPOSER.md](COMPOSER.md) |
| Claude | Design review of UI PRs (`VERDICT: APPROVE` / `REQUEST_CHANGES`) | [CLAUDE.md](CLAUDE.md) |

Workflow v2 adopted 2026-10-03 (user-mandated). It replaces the single "brief -> Aider ->
2 retries" loop: the 2026-10-03 gaps-v1 run showed one-shot briefs fail when the brief's
picture of the code is wrong (06 and 07 needed hand edits). The audit pass catches that first.

---

## 1. Infrastructure and context budget (verified 2026-10-03)

| Item | Value |
| --- | --- |
| Serving | Linux Ollama in WSL on `MUC-A-3099`, systemd user service `ollama-local.service`, `127.0.0.1:11436` on that host |
| Server env | `OLLAMA_CONTEXT_LENGTH=32768`, `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_KV_CACHE_TYPE=q8_0`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_KEEP_ALIVE=30m` |
| Model | `qwen3-coder:30b`; GGUF native context 262144, **no** `num_ctx` in its Modelfile (`/api/show` parameters: temperature 0.7, top_k 20, top_p 0.8, repeat_penalty 1.05) |
| Aider | 0.86.2 on the Mac (`~/.local/bin/aider`); `~/.aider.model.settings.yml` sets `extra_params: num_ctx: 32768` for `ollama_chat/qwen3-coder:30b` |
| **Effective `num_ctx`** | **32,768 tokens** (server default and Aider's explicit `num_ctx` agree) |
| **Audit budget** | **~19,000 tokens** (~60 % of `num_ctx`): brief + read-only files + repo map + answer. Keep the edit pass under the same budget |
| Driver | Grok runs Aider over Shell on the Mac (`a23edb42…`), worktree `~/Projects/AppFly-gaps` (own `backend/.venv`, `frontend/node_modules`; Node 22 via `nvm use 22`) |
| Tunnel | `ssh -f -N -L 11436:127.0.0.1:11436 rtx5090` (Tailscale + WSL sshd). Use it whenever Aider runs on the Mac; required when `MUC-A-3099` shows disconnected |
| Scratch | `~/Projects/.logs/briefs/<id>/` (BRIEF.md, AUDIT.md, GATE.txt, logs); scripts in `~/Projects/.logs/lc/`. Never committed |

Re-check the budget when anything above changes:

```bash
curl -s 127.0.0.1:11436/api/show -d '{"model":"qwen3-coder:30b"}'   # parameters / model_info
ssh rtx5090 'systemctl --user show-environment; ps aux | grep ollama'
cat ~/.aider.model.settings.yml                                     # num_ctx Aider sends
```

Aider prints `Tokens: <sent> sent, <recv> received` per call. If an audit's "sent" is above
~19k, the brief's read list is too big: split the task or read line ranges via a smaller file set.

---

## 2. The workflow (every task)

```text
1 Brief (Grok)  ->  2 Audit pass (coder, read-only)  ->  3 Audit check (Grok)
                                                              |  narrow / rewrite brief
                                                              v
4 Edit pass per step (coder, fresh session, test first)  ->  gates  ->  Grok commits step
        | gate fails
        v
5 Retry (max 3): coder updates AUDIT.md first, then a fresh edit session.  Still failing: split.
```

1. **Brief** (Grok), from [BRIEF_TEMPLATE.md](BRIEF_TEMPLATE.md): goal and user-facing why, files
   in scope with anchors (function names, line ranges), **max 2 files to edit + 1 test** per step,
   audit scope (files/symbols/ranges + 3-5 questions), context budget, fail-then-pass acceptance
   test, gates, out of scope, constraints. Bulk work = numbered steps, one function/section +
   one test each.
2. **Audit pass** (you, read-only). Aider ask mode, the brief's read files plus a 1024-token repo
   map. You write **AUDIT.md**: answers, current behaviour, exact lines to change, callers/tests
   affected, the test you will write first, contradictions with the brief. **No code edits.**
3. **Audit check** (Grok, cheap). Grok reads AUDIT.md only. If the code contradicts the brief,
   Grok narrows the scope or rewrites the brief (and re-runs the audit) before any edit.
4. **Edit pass** (you, fresh Aider session per step). Context = BRIEF.md + AUDIT.md + the
   step's in-scope files + its test, no repo map, no earlier chat. Write the test first, then
   the code, `--edit-format diff`. Self-gate with the step's test command (`--test-cmd`,
   `--auto-test`). Grok runs the full gates and commits after each step; the next step starts
   from the committed code + AUDIT.md.
5. **Retry** (max 3 per step). Grok saves the failing gate output as `GATE.txt`. You first
   append `## Retry <k>` to AUDIT.md (ask mode: what failed, cause, fix), then a fresh edit
   session fixes only that. Still failing after 3: Grok splits the step. Grok writes code only
   as a last resort and logs it (STATE log + PR body).

Fail-then-pass: Grok proves the new test fails without the fix before accepting a step:
back up the step's source files, `git show HEAD:<file> > <file>`, run the new test (expect a
failure), restore the backups (`~/Projects/.logs/lc/fe-step.sh <test> <src files…>` does this
and then runs the full frontend gates). Do not use `git stash` for this: when there is nothing
to stash (for example with an intent-to-add file) a following `git stash pop` applies an
unrelated older stash.

---

## 3. Exact commands (Mac, `~/Projects/AppFly-gaps`)

Shared flags (`~/Projects/.logs/lc/common.sh`):

```bash
export OLLAMA_API_BASE=http://127.0.0.1:11436
AIDER=(perl -e 'alarm shift; exec @ARGV' 1200 ~/.local/bin/aider
  --model ollama_chat/qwen3-coder:30b
  --no-auto-commits --no-dirty-commits --yes-always --no-gitignore
  --no-pretty --no-stream --no-check-update --no-analytics --no-show-model-warnings
  --no-show-release-notes --no-detect-urls --no-suggest-shell-commands
  --no-restore-chat-history --input-history-file /dev/null)
```

**Audit pass** (`~/Projects/.logs/lc/audit.sh <id> <read files…>`):

```bash
d=~/Projects/.logs/briefs/<id>
"${AIDER[@]}" --chat-mode ask --map-tokens 1024 \
  --chat-history-file $d/audit.chat.md \
  --read $d/BRIEF.md --read <file1> --read <file2> … \
  --message-file ~/Projects/.logs/lc/AUDIT_PROMPT.md > $d/audit.log 2>&1 < /dev/null
# the script copies the last assistant reply from audit.chat.md into $d/AUDIT.md
```

**Edit pass** (`TEST_CMD='<step test>' ~/Projects/.logs/lc/edit.sh <id> <step> <files…>`):

```bash
printf '*\n!/%s\n' <editable files…> > $d/aiderignore-<step>      # only the step's files are addable
"${AIDER[@]}" --edit-format diff --map-tokens 0 --aiderignore $d/aiderignore-<step> \
  --chat-history-file $d/edit-<step>.chat.md \
  --read $d/BRIEF.md --read $d/AUDIT.md [--read $d/GATE.txt] \
  --test-cmd '<step test, e.g. cd frontend && npx vitest run src/x.test.ts>' --auto-test \
  <editable file 1> [<editable file 2>] <test file> \
  --message-file $d/EDIT_<step>.md > $d/edit-<step>.log 2>&1 < /dev/null
```

**Retry audit update**: `PROMPT=RETRY_AUDIT_PROMPT.md APPEND=1 audit.sh <id> <files…>`, then a
fresh edit pass with `EDIT_<step>r<k>.md`.

Notes from the 2026-10-03 runs:

- `whole` and `udiff` produced no edits with qwen3-coder; use `diff`.
- Pass every file to edit as an editable file (files only mentioned in text get dropped).
- **File mentions discard edits.** With `--yes-always`, Aider adds any repo file the reply
  mentions (for example a Markdown link to `AGENTS.md`) and re-asks, dropping the edits it
  already proposed. `edit.sh` writes a per-step `--aiderignore` that ignores `*` and
  un-ignores only the step's files (`!/<path>`; do not add `!*/`, it un-ignores everything).
- A SEARCH block must hold whole lines. Long Markdown lines fail when the model starts a
  SEARCH mid-line; tell it the line's first words.
- Aider leaves trailing whitespace on blank lines: run `git diff --check`; stripping it
  (`sed -i '' -E 's/[[:space:]]+$//' <file>`) is a mechanical fix, not a hand edit.
- The Mac has no `rg`; use `grep -E` in `TEST_CMD` and brief checks.

---

## 4. Gates (Grok runs them after each step; Composer re-checks before merge)

| Stack | Command |
| --- | --- |
| Backend | `cd backend && .venv/bin/python -m pytest -q` |
| Backend lint | `cd backend && ruff check .` with ruff **0.16.10** (pinned as in CI) |
| Frontend (Node 22) | `cd frontend && npm test && npm run build` |
| All | `git diff --check` |
| PR | GitHub CI green (Backend, Frontend, Desktop) |

---

## 5. Allowed and forbidden

Allowed: edit only the step's editable files; read the brief's audit files; write AUDIT.md
content (ask mode replies).

Forbidden:

- Deciding architecture, interfaces or scope. If the brief is wrong, say so in AUDIT.md §6.
- Files outside the step, including `package.json`, `pyproject.toml`, lockfiles, `.github/`,
  `.env*`, `config.yaml`.
- Secrets: never read, print, write or invent key values.
- Git state changes (commit, push, checkout, reset, stash, branch). Grok controls git.
- Installing dependencies. Weakening `policy.py` or adding deny-listed hosts.
- Real network calls in tests (mock LLM clients; use conftest keychain backends, temp dirs).

---

## 6. Logging

Grok logs each task in the STATE log (brief id, audit tokens, steps, retries, gate results,
any hand-written code) and in [TOKEN_LOG.md](../workflow/TOKEN_LOG.md).
