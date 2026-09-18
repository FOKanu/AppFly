# Activity

Purpose: Run history from `Runs/` via the local API (scaffold only).

## Main files

- Add `ActivityPage.tsx` in this folder when the screen is implemented.

## How to extend

1. Create the page component here with a Purpose / Inputs / Returns / Does not docstring.
2. Keep the route in `frontend/src/routes.ts` (`path: "/activity"`).
3. Import the page from `frontend/src/app/App.tsx` instead of the placeholder.
4. Talk to the local API via `frontend/src/shared/api/` only. Never vault I/O or Gemini/Apify HTTP from React.
