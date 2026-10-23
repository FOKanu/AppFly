# Orchestrator handoff — 2026-10-23 (polish-followups-v1 open)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`23768d2`** — mvp-blockers-v1 via Stage PR #152 |
| Open epic | **`integrate/polish-followups-v1`** (from `23768d2`). Branch from it; PR into it. It reaches `main` only via a Stage PR the user merges. |
| Next | Small follow-ups, then the remaining polish-v2 UI items (B9b–B13), then the open list in [FOLLOW_UPS](../design/FOLLOW_UPS.md) (user decisions, F1) |
| Claude | Mac only when gated. Rule: `.cursor/rules/claude-handoff.mdc` |
| 5090 | Slice briefs; check-ins. Rule: `.cursor/rules/local-coder-bulk.mdc` |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/polish-followups-v1 && git pull --ff-only
# cut feat/… / fix/… and PR into integrate/polish-followups-v1 while it is open
```

Do not reopen `integrate/mvp-blockers-v1`, `integrate/polish-v2`, `integrate/ui-honesty-v1`, `integrate/gaps-v1`, `integrate/mvp-v1` or `integrate/prototype-v1` for new work.
