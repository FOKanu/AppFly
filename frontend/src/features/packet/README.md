# Packet

Purpose: Inspect a sealed writer packet (one job + CV slice) before send-to-model (scaffold only).

## Main files

- Add `PacketPage.tsx` in this folder when the screen is implemented.

## How to extend

1. Create the page component here with a Purpose / Inputs / Returns / Does not docstring.
2. Keep the route in `frontend/src/routes.ts` (`path: "/packet"`).
3. Import the page from `frontend/src/app/App.tsx` instead of the placeholder.
4. Talk to the local API via `frontend/src/shared/api/` only. Never vault I/O or Gemini/Apify HTTP from React.
