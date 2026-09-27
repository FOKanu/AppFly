# Orchestrator handoff — 2026-09-27 (M4 landed; M5 in flight)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`ff61b86`** — Stage 1 via #48 |
| Open epic | **`integrate/mvp-v1` @ `4a734b4`** (M6 wizard #58) |
| Next | **M7** `feat/ui-mock-honesty` — samples only offline/timeout |
| After M7 | **M8** privacy (Composer) |
| Claude | Mac only when gated (M6/M7). Rule: `.cursor/rules/claude-handoff.mdc` |
| 5090 | Slice briefs; check-ins. Rule: `.cursor/rules/local-coder-bulk.mdc` |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/mvp-v1 && git pull --ff-only
# tip must be at least 2fedb3c; then cut feat/… and PR into integrate/mvp-v1
```

Do not cut from `main` while this epic is open.
