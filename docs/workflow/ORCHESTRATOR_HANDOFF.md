# Orchestrator handoff — 2026-09-27

Grok (Iyeke) ran out of Grok Bot usage credits mid-wave. **Cursor temporarily
owns the planner / orchestrator loop** until Grok is back. The local-coder path
(Aider on `MUC-A-3099`) is unchanged when reachable.

## Pickup point

| Item | State |
| --- | --- |
| Epic tip (merged) | `origin/integrate/prototype-v1` @ **`b6a247f`** (#37 merged) |
| Open PR | **#38** Post-B1 B (Tonight/Activity) — CI green @ `fcf89db`; waiting Claude final OK |
| Next build | **B4** + **F4** — `feat/backend-run-visibility` ([FOLLOW_UPS.md](../design/FOLLOW_UPS.md), brief [briefs/B4-run-visibility.md](briefs/B4-run-visibility.md)) |
| Stale PRs | Closed `cursor/*` drafts #1–#6, #10 (and earlier #7–#8) — do not revive |
| 5090 from Mac | May be unreachable if Tailscale is down; implement on Cursor or fix Tailscale first |

## Product defaults (Grok morning questions)

| Question | Decision until human overrides |
| --- | --- |
| Nightly venv | This checkout: `backend/.venv` under AppFly |
| Schedule | Keep **21:00** weekdays in `launchd/` (source of truth). UI mock `02:00` is out of B4 |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/prototype-v1 && git pull --ff-only
# tip must be at least b6a247f; then cut feat/… and PR into integrate/prototype-v1
```

Do not cut from `main` while this epic is open.
