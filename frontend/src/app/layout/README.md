# App layout

Persistent chrome for the instrument panel, aligned to the Figma desktop frames
at 1440×900:

- `Sidebar` — 232px rail: AppFly brand mark, profile switcher, numbered nav
  01–06, and the system-status card pinned to the bottom.
- `ControlHeader` — 60px: breadcrumb + page title, 240px ⌘K search, heartbeat
  pill, and Run now / Pause nightly / Stop.
- `RunningBar` — 32px mono telemetry strip spanning the full width.
- `Heartbeat` — the state pill the jobhunt CLI drives.

`OfflineBanner` sits at the top of the main column when Local IPC is down.
`useBreakpoint` only sets `data-breakpoint` on the shell — layout stays CSS.

The system status lives inside the sidebar, not as a separate footer row.

`App.tsx` is the route table. Do not replace this chrome with `ResponsiveShell`.
Feature screens live in `src/features/<name>/`. This folder does not load job
packets or connector keys.
