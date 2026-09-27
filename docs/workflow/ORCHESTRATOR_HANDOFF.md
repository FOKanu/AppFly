# Orchestrator handoff — 2026-09-27 (mvp-v1 closed on main)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`5a5adc9`** — mvp-v1 landed via #61 (M1–M8) |
| Open epic | **None.** Branch from `main`; PR into `main`. |
| Next | Post-MVP polish: **F3 Vitest** (`feat/ui-vitest-f3`), then remaining FOLLOW_UPS (F1, leftover F5 items as needed) |
| Claude | Mac only when gated. Rule: `.cursor/rules/claude-handoff.mdc` |
| 5090 | Slice briefs; check-ins. Rule: `.cursor/rules/local-coder-bulk.mdc` |

## Agent sync rule

```bash
git fetch origin
git checkout main && git pull --ff-only
# cut feat/… and PR into main until Grok opens the next integrate/<epic>
```

Do not reopen `integrate/mvp-v1` for new work; prefer `main` until the next epic is announced.
