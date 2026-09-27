# M3 cloud check-in (2026-09-27)

After Mac Claude decision ([M3-claude-decision.md](M3-claude-decision.md)). Orchestrator accepts Claude defaults as follows, then sliced 5090 UI.

| Flag | Decision |
| --- | --- |
| **F1** | Defer backend `cv_id` on run rows. Re-attach / Activity show `CV: —` as Claude specced. Optional follow-up PR later. |
| **F2** | Accept UI: disable Run now when no usable CV / selected extract not `ok`. Defer API 422 and CLI/nightly empty-CV block. |
| **F3** | Mobile: icon + sheet (implement in picker UI slice). |
| **F4** | Override is this-run only; “Make active” stays in Vault. |

## 5090 slices

| Slice | Concern | ALLOWED (approx) |
| --- | --- | --- |
| **A** | Types + RunContext CV state + `start()` POST `{ cv }` | `shared/run/*`, `vault/types.ts` |
| **B** | ControlHeader picker + states/copy | `app/layout/ControlHeader.tsx`, new picker component under `shared/run/` |
| **C** | Workflow `Using:` line, 404 reset, tests | `workflow/*`, tests |

Check in with cloud after each slice before the next.
