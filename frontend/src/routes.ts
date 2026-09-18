/**
 * Purpose: Central route table. Add a screen by appending a row and a feature folder.
 * Inputs: None (static config).
 * Returns: APP_ROUTES consumed by App.tsx and AppShell.
 * Does not: Fetch jobs, touch the vault, or render feature UI.
 */

export type AppRoute = {
  path: string;
  feature: string;
  title: string;
};

export const APP_ROUTES: AppRoute[] = [
  { path: "/", feature: "tonight", title: "Tonight" },
  { path: "/queue", feature: "queue", title: "Queue" },
  { path: "/packet", feature: "packet", title: "Packet" },
  { path: "/workflow", feature: "workflow", title: "Workflow" },
  { path: "/memory", feature: "memory", title: "Memory" },
  { path: "/activity", feature: "activity", title: "Activity" },
  { path: "/settings", feature: "settings", title: "Settings" },
];
