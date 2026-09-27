/**
 * Purpose: Named route paths for the copilot shell.
 * Does not: register React elements or fetch page data.
 */
export const ROUTES = {
  root: "/",
  tonight: "/tonight",
  queue: "/queue",
  packet: "/packet",
  workflow: "/workflow",
  vault: "/vault",
  profiles: "/profiles",
  memory: "/memory",
  activity: "/activity",
  settings: "/settings",
  /** M6 first-launch wizard (outside AppShell). */
  setup: "/setup",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
