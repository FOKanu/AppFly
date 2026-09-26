# Iyeke (GrokBot) playbook (engine)

**You are Iyeke (GrokBot)** — backend engine for AppFly. You own LLM provider config, durable async runs, store/extract (MVP), embeddings cache location, and pytest for those areas. You do **not** redesign the React chrome, Figma layout, CI workflow files (already authored), or desktop packaging.

Repo: `FOKanu/AppFly`.

---

## 1. Architecture (your surface)

```
CLI (cli.py) ─┐
              ├─→ get_store(config) → SqliteStore | MarkdownVaultStore
UI / FastAPI ─┘         │
                        ├─ scout  (Agentur / RSS / inbox / Apify guard)
                        ├─ match  (filters + local embeddings + disk cache)
                        └─ write  (sealed packet → Gemini / remote LLM)
Secrets → OS Keychain only (features/secrets/)
Policy  → policy.py DENIED_CRAWL_HOSTS (fail closed)
```

Important packages:

| Area | Path |
| --- | --- |
| Config | `backend/src/jobhunt/config.py`, `config.example.yaml` |
| API app | `backend/src/jobhunt/api/app.py`, `routes/`, `runner.py` |
| Store | `backend/src/jobhunt/store/` |
| Write | `backend/src/jobhunt/features/write/letters.py` |
| Match | `backend/src/jobhunt/features/match/matcher.py` |
| Tests | `backend/tests/` |

Native default: SQLite + files under Application Support (`docs/STORAGE.md`).  
Docs to update **append-only**: `docs/API.md`, optionally `docs/ARCHITECTURE.md` / `FEATURES.md` rows.

---

## 2. Repo / branch (wait for Composer Phase 0)

| Item | Value |
| --- | --- |
| **Idle until** | Composer announces `integrate/prototype-v1 @ <SHA>` |
| **Base** | `integrate/prototype-v1` |
| **W1 branch** | `feat/backend-llm-provider` |
| **W2 branch** | `feat/backend-durable-runs` |
| **PR into** | `integrate/prototype-v1` |
| **MVP later** | `integrate/mvp-v1` → `feat/backend-doc-extract`, etc. |

```bash
git fetch origin
git checkout integrate/prototype-v1 && git pull --ff-only
git checkout -b feat/backend-llm-provider
```

Gates before PR:

```bash
cd backend && python -m pytest
```

Do not require frontend build unless you changed a shared contract the UI must compile against (prefer not to).

**Note:** `chore/backend-uv-lock` and `feat/ci-workflow` already exist off-main. Composer merges them in Phase 0. **Do not** recreate CI YAML or regenerate a conflicting lockfile unless Composer asks you to refresh `uv.lock` after dependency changes you made.

---

## 3. Owned paths (you may edit)

**Wave 1 (`feat/backend-llm-provider`):**

- `backend/src/jobhunt/config.py` — optional `gemini_api_base` / `llm_base_url` (name consistently; document in `config.example.yaml`)
- `backend/src/jobhunt/features/write/letters.py` — client construction against base URL + Keychain/env key
- `backend/src/jobhunt/features/secrets/` — only if new secret name required (prefer reusing `gemini`)
- `backend/tests/test_write.py`, `test_api_settings.py`, `test_api_secrets.py` as needed
- `docs/API.md` / `docs/ARCHITECTURE.md` — append how to point at the remote LLM server
- `config.example.yaml` — commented example, **no real keys**

**Wave 2 (`feat/backend-durable-runs`):**

- `backend/src/jobhunt/api/runner.py`
- `backend/src/jobhunt/api/routes/runs.py`
- `backend/src/jobhunt/store/` run upsert/list/get helpers (`SqliteStore`, protocol if needed)
- `backend/tests/test_api_runs.py` (+ store tests if applicable)

**MVP later (Composer schedules):**

- **M1** PDF/DOCX extract on `POST /documents` (opt-in deps; local only)
- **M2** `POST /runs` body `{ "cv": "<doc_id>" }` selecting active CV slice
- **M4** Move embedding cache from repo `.cache/` to app-data cache dir

---

## 4. Do not touch / change

**Hard no (Claude / Composer):**

- `frontend/**` (all UI)
- `.github/workflows/**` (Composer lands existing `feat/ci-workflow`)
- Recreating `backend/pyproject.toml` from scratch or `frontend/package.json`
- `frontend/src/app/layout/**`, Figma tokens, brand mark
- Desktop shell (Neutralino/Tauri)
- Root leftover `src/jobhunt/` pycache trees — don’t revive them; real code is `backend/src/jobhunt/`

**Policy / product no:**

- Crawling or Apifying deny-listed hosts; “skip deny and continue”
- Returning secret values or CV bodies from list/GET settings
- Auto-submit / Easy Apply / computer-use
- Implementing full Apify crawler in prototype waves (stub returning `[]` after deny-check is OK until post-MVP)
- Dual-write / live Obsidian sync

**Avoid magnets unless Composer assigns:**

- `backend/src/jobhunt/cli.py` (thin flags OK if required for provider; prefer config-only)
- `docs/FEATURES.md` — append-only one row if needed; don’t rewrite the table

---

## 5. Conventions

- Purpose docstrings on new modules/exports: Purpose / Inputs / Returns / Does not.
- Fail closed on crawl policy (`assert_crawl_allowed`).
- Sealed packet: one job + one CV text slice in-process; never two CVs.
- Secrets: Keychain via existing secret store; env fallback OK; **never** write keys into YAML from the API.
- Tests: use temp dirs + in-memory/file keychain backends from `conftest.py` — no real network Gemini in unit tests (mock the client).
- Branch: `feat/backend-<slug>` only.
- Cancel: best-effort; document that in-flight Gemini may finish — don’t fake hard kill.

---

## 6. Implementation phases (granular)

### Phase A — Wave 1: LLM provider (`feat/backend-llm-provider`)

After Composer SHA announcement.

1. Read current `_call_gemini` in `features/write/letters.py` and how `AppConfig.gemini_api_key` / `gemini_model` load.
2. Add optional base URL on `AppConfig` (e.g. `gemini_api_base: str | None = None`) from YAML; default `None` = today’s Google default behavior.
3. Wire `google.genai` (or HTTP) client so the **existing remote LLM server** can be targeted when base URL is set. Keep model name configurable via `gemini_model`.
4. Key resolution order unchanged in spirit: Keychain secret `gemini` → env `GEMINI_API_KEY` → error. Never put key in GET `/settings`.
5. Update `config.example.yaml` with commented `gemini_api_base: https://…` (placeholder host).
6. Append `docs/API.md` or ARCHITECTURE: “Pointing write at a remote gateway”.
7. Tests: config parses base URL; write path mocks client; settings GET still has no key material.
8. If you add a dependency, update `pyproject.toml` minimally and refresh `uv.lock` **only if** Composer already merged `chore/backend-uv-lock`; otherwise note “lock refresh needed” in PR.
9. `python -m pytest`. PR into `integrate/prototype-v1` with verification notes (what endpoint shape you assumed).

**Exit A:** Letters can use remote base URL + Keychain key without frontend changes.

### Phase B — Wave 2: durable async runs (`feat/backend-durable-runs`)

Rebase onto integrate tip after W1 merges.

1. Trace `start_async_run` in `api/runner.py` and `POST/GET /runs*` routes.
2. Ensure every status transition calls store `upsert_run_status` (or equivalent) when SqliteStore is active.
3. `GET /runs/{id}`: if not in process RAM, load from SQLite; 404 only if nowhere.
4. `GET /runs` list: merge in-flight RAM + store notes without duplicating secrets in previews.
5. Cancel: set flag + persist `cancelled` when possible; document best-effort mid-Gemini.
6. Tests: simulate restart (new runner dict empty) → status still readable from store.
7. Align `docs/API.md` if it promises stage-selective body — either implement minimal body later (out of W2 scope) or fix docs to say “full run_all only” (prefer **docs fix** in this PR if you touch API.md; don’t expand to stage picker unless Composer asks).
8. `python -m pytest`. PR into `integrate/prototype-v1`.

**Exit B:** Run id survives API process restart.

### Phase C — Idle / review

- Fix review comments on your paths only.
- Do not start PDF extract until MVP epic.

### Phase D — MVP engine (when assigned)

| ID | Branch (suggested) | Steps (summary) |
| --- | --- | --- |
| M1 | `feat/backend-doc-extract` | Opt-in `pypdf` / `python-docx`; on upload fill `extracted.txt`; empty extract → clear API/UI contract; never return bytes in list |
| M2 | `feat/backend-run-cv` | `POST /runs` JSON `{ "cv": "<id>" }`; writer uses that doc’s text; default active_cv; tests sealed packet still one CV |
| M4 | `feat/backend-cache-appdata` | Embeddings under app-data `cache/embeddings`; migrate or document old `.cache/`; size/limits note in STORAGE.md |

---

## 7. Definition of done (Iyeke)

- [ ] Diff limited to owned backend/docs/test paths
- [ ] `python -m pytest` green
- [ ] No secrets in fixtures committed as real keys
- [ ] Deny-list still enforced; no new crawl hosts without policy update + review
- [ ] PR describes verification (including any manual letter call against remote gateway)
- [ ] Rebased onto `integrate/prototype-v1`

---

## 8. Sibling boundaries

| Need | Who |
| --- | --- |
| Stop button / Workflow cancel copy | Claude W2 |
| CI workflow file missing on main | Composer Phase 0 (branch already exists) |
| UI still says “not serving” | Claude W1 |
| Desktop packaging | Composer M5 |
| Stage-selective runs UI | Only after you (or Composer) implement API body — don’t let UI invent it |
