# Orchestrator handoff — 2026-09-27 (M4 landed; M5 in flight)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`ff61b86`** — Stage 1 via #48 |
| Open epic | **`integrate/mvp-v1` @ `2fedb3c`** (M4 cache #56) |
| Next | **M5** `feat/desktop-shell` — Neutralino + spawn API (Composer-owned) |
| After M5 | **M6** wizard (Mac Claude first) → **M7** mock honesty → **M8** privacy (Composer) |
| Claude | Mac only when gated (M6/M7). Rule: `.cursor/rules/claude-handoff.mdc` |
| 5090 | Slice briefs; check-ins. Rule: `.cursor/rules/local-coder-bulk.mdc` |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/mvp-v1 && git pull --ff-only
# tip must be at least 2fedb3c; then cut feat/… and PR into integrate/mvp-v1
```

Do not cut from `main` while this epic is open.
