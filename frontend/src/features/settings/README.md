# Settings

Purpose: Vault path, enabled sources, and write-only secret flags (scaffold only).

## Main files

- Add `SettingsPage.tsx` in this folder when the screen is implemented.

## How to extend

1. Create the page component here with a Purpose / Inputs / Returns / Does not docstring.
2. Keep the route in `frontend/src/routes.ts` (`path: "/settings"`).
3. Import the page from `frontend/src/app/App.tsx` instead of the placeholder.
4. GET `/settings` may show `{ gemini: bool, apify: bool }` only — never key values. PUT secrets via `/settings/secrets/{name}`. No API keys in frontend env besides `VITE_API_BASE_URL`.
