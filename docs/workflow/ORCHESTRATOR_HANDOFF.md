# Orchestrator handoff — 2026-10-03 (gaps-v1 open)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`d9d7d15`** — mvp-v1 via #61 (M1–M8) + F3 Vitest via #62 |
| Open epic | **`integrate/gaps-v1`** (from `d9d7d15`). Branch from it; PR into it. It reaches `main` only via a Stage PR the user merges. |
| Next | Finish gaps-v1 (#63–#68 + docs sync), then the open list in [FOLLOW_UPS](../design/FOLLOW_UPS.md#still-open-after-gaps-v1-2026-10-03) (UI honesty pass, user decisions, F1) |
| Claude | Mac only when gated. Rule: `.cursor/rules/claude-handoff.mdc` |
| 5090 | Slice briefs; check-ins. Rule: `.cursor/rules/local-coder-bulk.mdc` |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/gaps-v1 && git pull --ff-only
# cut feat/… / fix/… and PR into integrate/gaps-v1 while it is open
```

Do not reopen `integrate/mvp-v1` or `integrate/prototype-v1` for new work.
