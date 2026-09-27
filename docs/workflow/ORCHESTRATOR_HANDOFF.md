# Orchestrator handoff — 2026-09-27 (Stage 1 closed)

Grok (Iyeke) credits may still be out. **Cursor may keep the planner seat** until Grok is back.
Compute mode: **default** unless opt-in / token-limit → **optimized** ([MULTI_AGENT.md §1a](MULTI_AGENT.md)).

## Pickup point

| Item | State |
| --- | --- |
| `main` | **`ff61b86`** — Stage 1 via #48 (`integrate/prototype-v1` merged) |
| Open epic | **`integrate/mvp-v1` @ `ff61b86`** |
| Next | **M1** `feat/backend-doc-extract` ([MVP_SEQUENCE.md](MVP_SEQUENCE.md)) |
| Claude | **Not yet** — call before M3 after M1+M2 land |
| 5090 | Reachable via Tailscale when needed (`rtx5090` / `MUC-A-3099`) |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/mvp-v1 && git pull --ff-only
# tip must be at least ff61b86; then cut feat/… and PR into integrate/mvp-v1
```

Do not cut from `main` while this epic is open. Do not continue prototype-only branches.
