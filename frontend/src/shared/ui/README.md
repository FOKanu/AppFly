# Shared UI

Design tokens and the primitive kit live in `src/shared/ui/`:

- `tokens.ts` — the single source of colour, type, space, radius and layout,
  mirrored from the Figma "UI · 00 Cover & Foundations" frame. `applyTokens()`
  writes them onto `:root` as CSS variables; stylesheets consume the variables,
  never literal hex.
- Primitives: `Button`, `Input`, `Chip`, `Card`, `StatusChip`, `Tag`, `Score`,
  `Meter`, `Segmented`, `Switch`, `TokenField`, `SourceBadge`.
- Edge-state chrome: `Banner`, `EmptyState`, `OfflineBanner`.

`useBreakpoint` is in `src/shared/`. Feature screens belong in
`src/features/<name>/`. Point `VITE_API_BASE_URL` at the local API; never put
Gemini or Apify keys in frontend env files.
