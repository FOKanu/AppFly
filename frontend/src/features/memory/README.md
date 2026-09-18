# Memory

Purpose: Requirements, CV slice, and voice-sample reminders (scaffold only).

## Main files

- Add `MemoryPage.tsx` in this folder when the screen is implemented.

## How to extend

1. Create the page component here with a Purpose / Inputs / Returns / Does not docstring.
2. Keep the route in `frontend/src/routes.ts` (`path: "/memory"`).
3. Import the page from `frontend/src/app/App.tsx` instead of the placeholder.
4. Talk to the local API via `frontend/src/shared/api/` only. Never vault I/O or Gemini/Apify HTTP from React.
