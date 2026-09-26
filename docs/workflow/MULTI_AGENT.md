# Multi-agent + RTX 5090 coding flow (optional)

Maintainer-only. Not part of the AppFly product architecture.

Product what/who/where: [`docs/agents/`](../agents/README.md).  
Paste prompts: [`PROMPTS.md`](PROMPTS.md).

---

## Idea

```text
Composer (cloud judgment)     → epics, merges, smoke
Claude / Iyeke (GrokBot) (cloud planning) → design, briefs, review, PRs
RTX 5090 local coder           → file-bounded implementation only
```

- Claude and Iyeke do **high-level** thinking and planning for their product playbooks.
- They hand **coding tasks with guidance** to a local OpenAI-compatible model on the 5090.
- The **5090 is not a git branch**. Work stays on the same `feat/…` branch the planner opened.
- AppFly’s product letter LLM (`gemini_api_base` in Iyeke’s engine playbook) is **unrelated** to this coding farm.

---

## Git branches (same as product playbooks)

| Who | Wave | Branch | PR into |
| --- | --- | --- | --- |
| Composer | Phase 0 | Merge `feat/ci-workflow`, `chore/backend-uv-lock`, `feat/ui-profile-menu-vault` | `main` |
| Composer | Phase 0 | Create `integrate/prototype-v1` | epic base |
| Claude | W1 | `feat/ui-firstrun-truth` | `integrate/prototype-v1` |
| Claude | W2 | `feat/ui-run-progress` | `integrate/prototype-v1` |
| Iyeke (GrokBot) | W1 | `feat/backend-llm-provider` | `integrate/prototype-v1` |
| Iyeke (GrokBot) | W2 | `feat/backend-durable-runs` | `integrate/prototype-v1` |
| Composer | W3 | smoke + `integrate/prototype-v1` → `main` | `main` |

MVP (later): `integrate/mvp-v1`; see product playbooks for `feat/backend-doc-extract`, `feat/ui-cv-picker`, etc.

---

## Placeholders

```text
LOCAL_LLM_BASE_URL: https://<5090-host>:<port>/v1
LOCAL_LLM_MODEL:    <coding model id>
EPIC_BASE:          integrate/prototype-v1 @ <SHA>
```

---

## Handoff rules

1. Planner (Claude or Iyeke) finishes design against their `docs/agents/*.md` playbook.
2. Send one brief to the 5090 (template in PROMPTS.md).
3. 5090 patches the **current feature branch** only.
4. Planner reviews, rejects scope creep, owns the PR text and verification.

Composer prefers cloud judgment for merges; may optionally use the 5090 for mechanical bulk work only.
