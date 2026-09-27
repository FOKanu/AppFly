# Orchestrator handoff — 2026-09-27 (M1+M2 on mvp-v1)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`ff61b86`** — Stage 1 via #48 |
| Open epic | **`integrate/mvp-v1` @ `e7843e6`** (#53 bulk-rule docs, #52 M2 run-cv) |
| Next | **M3** CV picker — call **Mac Claude** with [briefs/M3-claude-ask.md](briefs/M3-claude-ask.md), then sliced 5090 UI briefs |
| Claude | **Now** — Mac Claude only (not Cursor Claude agent). Richer context OK; check-in before coding. Rule: `.cursor/rules/claude-handoff.mdc` |
| 5090 | Slice UI work after Claude acceptance; check-ins between slices (`.cursor/rules/local-coder-bulk.mdc`) |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/mvp-v1 && git pull --ff-only
# tip must be at least e7843e6; then cut feat/… and PR into integrate/mvp-v1
```

Do not cut from `main` while this epic is open. Do not continue prototype-only branches.
