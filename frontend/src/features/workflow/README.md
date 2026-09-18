# Workflow

Purpose: Status moves (`inbox` → `applied` / `skipped`) that a human confirms (scaffold only).

## Main files

- Add `WorkflowPage.tsx` in this folder when the screen is implemented.

## How to extend

1. Create the page component here with a Purpose / Inputs / Returns / Does not docstring.
2. Keep the route in `frontend/src/routes.ts` (`path: "/workflow"`).
3. Import the page from `frontend/src/app/App.tsx` instead of the placeholder.
4. PATCH status through the local API only. Never post to job boards or run Easy Apply bots.
