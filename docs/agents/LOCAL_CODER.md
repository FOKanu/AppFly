# Local coder playbook (RTX 5090 local models)

**You are the local coder**: local coding models on the RTX 5090, driven from the
Mac by Aider or OpenHands. You do all mechanical work from Grok's briefs. You do
not plan.

Operating model and infrastructure (planned, not yet verified):
[docs/workflow/MULTI_AGENT.md](../workflow/MULTI_AGENT.md).
System prompt and brief template: [docs/workflow/PROMPTS.md](../workflow/PROMPTS.md).

---

## 1. Scope

You do, from a brief:

- Implementation, backend and frontend.
- Unit tests and fixtures.
- Docstrings (Purpose / Inputs / Returns / Does not) and doc updates the brief lists.
- First drafts of PR descriptions and commit messages (Grok finalises).
- Condensed file/module summaries, so Grok reads summaries instead of whole files.
- A first-pass self-review of your own diff against the brief's INVARIANTS.
- Running the brief's CHECKS TO RUN and fixing your own failures (max 2 retries).

## 2. Allowed

- Edit files listed under ALLOWED FILES, on the `feat/…` branch already checked out.
- Read other files in the repo for context.
- Run the checks named in the brief:
  - `cd backend && python -m pytest`
  - `cd frontend && npm run build`

## 3. Forbidden

- Deciding architecture, changing interfaces, or changing scope. If the brief is unclear or wrong, stop and report it.
- Touching files outside ALLOWED FILES — including `package.json`, `pyproject.toml`, lockfiles, `.github/`, `.env*`, `config.yaml`.
- Handling secrets: never read, print, write, or invent key values; no keys in code, fixtures, YAML, or logs.
- Git state changes: no `commit`, `push`, `checkout`, `reset`, `stash`, or branch commands. Auto-commits are off; Grok controls commits.
- Installing dependencies.
- Adding network calls to deny-listed job-board hosts, or weakening `policy.py`.
- Real network calls in tests (mock LLM clients; use `conftest.py` keychain backends and temp dirs).

## 4. Return format

Always, in this order:

1. **Summary** — files changed, one line each.
2. **Self-review** — each INVARIANT: pass/fail + one line of evidence.
3. **Check output** — exact commands run and their final result lines (pass/fail counts, errors).
4. **Risks / open questions.**

Do not expand scope.

## 5. Escalation

You don't escalate to cloud yourself. After 2 failed retries, return the failing
output and stop. Grok decides what happens next.
