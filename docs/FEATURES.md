# Features

One row per feature folder. Status `scaffold` means the folder and README exist; behavior may still live in Python from the original CLI.

| Feature | Folder | Public entry | Tests | Status |
| --- | --- | --- | --- | --- |
| Scout | `backend/src/jobhunt/features/scout/` | `collect_jobs` | `backend/tests/test_scout.py`, `test_inbox.py`, `test_policy.py` | moved |
| Match | `backend/src/jobhunt/features/match/` | `match_jobs` | `backend/tests/test_match.py` | moved |
| Write | `backend/src/jobhunt/features/write/` | `write_letters`, `build_packet` | `backend/tests/test_write.py` | moved |
| Vault | `backend/src/jobhunt/features/vault/` | `Vault`, `init_workspace` | `backend/tests/test_vault.py` | moved |
| Run log | `backend/src/jobhunt/features/runlog/` | `format_run_note` | via `jobhunt run` | moved |
| Tonight | `frontend/src/features/tonight/` | route `/` in `frontend/src/routes.ts` | — | scaffold |
| Queue | `frontend/src/features/queue/` | route `/queue` | — | scaffold |
| Packet | `frontend/src/features/packet/` | route `/packet` | — | scaffold |
| Workflow | `frontend/src/features/workflow/` | route `/workflow` | — | scaffold |
| Memory | `frontend/src/features/memory/` | route `/memory` | — | scaffold |
| Activity | `frontend/src/features/activity/` | route `/activity` | — | scaffold |
| Settings | `frontend/src/features/settings/` | route `/settings` | — | scaffold |
| App shell | `frontend/src/app/layout/` | `AppShell` | `npm run build` | scaffold |
| Shared UI | `frontend/src/shared/ui/` | (none yet) | — | scaffold |
| Shared API | `frontend/src/shared/api/` | (none yet) | — | scaffold |

Package-root modules that are **not** feature folders (stay where they are): `jobhunt.policy`, `jobhunt.models`, `jobhunt.config`, `jobhunt.cli`, `jobhunt.api` (health stub). Compatibility shims: `jobhunt.scout`, `jobhunt.match`, `jobhunt.write`, `jobhunt.vault`, `jobhunt.runlog`.
