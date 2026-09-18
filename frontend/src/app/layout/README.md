# App layout

Persistent chrome for the instrument panel: sidebar (desktop), bottom nav (≤1023px), control header, running bar, and system-status footer. `OfflineBanner` sits in the main column when Local IPC is down. `useBreakpoint` only sets `data-breakpoint` on the shell — layout stays CSS.

`App.tsx` is the route table. Do not replace this chrome with `ResponsiveShell`. Feature screens live in `src/features/<name>/`. This folder does not load job packets or connector keys.
