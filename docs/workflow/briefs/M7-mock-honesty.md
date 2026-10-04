# M7 — Mock-data honesty (F2)

Branch: `feat/ui-mock-honesty` → `integrate/mvp-v1`.

## Rule

Sample fixtures appear **only** when the failure kind is `offline` or `timeout`.
Any HTTP response means the API is up → danger banner, no samples.

## Touched

- `shared/api/mockPolicy.ts`, `shared/ui/SampleDataBanner.tsx`
- Tonight / Workflow / Activity loaders + pages
- Queue `jobsApi` (apiGet + timeout) / Packet letter via apiGet
- Memory sample banner copy aligned

Claude: skipped (copy taken from UI_WAVES_1_2 W1 item 3).
