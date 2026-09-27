# Orchestrator handoff — 2026-09-27 (evening)

Grok (Iyeke) ran out of Grok Bot usage credits mid-wave. **Cursor temporarily
owns the planner / orchestrator loop** until Grok is back. The local-coder path
(Aider on `MUC-A-3099`) is unchanged when reachable.

## Pickup point

| Item | State |
| --- | --- |
| Epic tip (merged) | `origin/integrate/prototype-v1` @ **`06fa6d8`** (#41 Post-B4 UI merged) |
| Open PR | none required for product — P7 gate |
| Next | **P7** manual happy path on tip; then human sign-off → `integrate/prototype-v1` → `main` |
| Stale PRs | Closed `cursor/*` drafts #1–#6, #10 (and earlier #7–#8) — do not revive |
| 5090 from Mac | Reachable via Tailscale (`rtx5090` / `MUC-A-3099`); Ollama `:11436` |

## Product defaults (Grok morning questions)

| Question | Decision until human overrides |
| --- | --- |
| Nightly venv | This checkout: `backend/.venv` under AppFly |
| Schedule | Keep **21:00** weekdays in `launchd/` (source of truth). UI display matches. |

## Agent sync rule

```bash
git fetch origin
git checkout integrate/prototype-v1 && git pull --ff-only
# tip must be at least 06fa6d8; then cut feat/… and PR into integrate/prototype-v1
```

Do not cut from `main` while this epic is open.

## P7 checklist (Composer)

Automated (done on `06fa6d8`):

- [x] `cd backend && python -m pytest` → 110 passed
- [x] `cd frontend && npm run build` → ok

Manual (human + Composer before integrate → main):

- [ ] Start API + Vite
- [ ] Workspace init / status
- [ ] Upload `.md`/`.txt` CV; set active
- [ ] Put Gemini (or remote) key via Settings
- [ ] Run Now → poll → open Packet → edit letter
- [ ] Stop on a running run (best-effort cancel)
- [ ] Human sign-off recorded in the integrate → main PR body
