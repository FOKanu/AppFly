/**
 * Purpose: Named route paths for the copilot shell.
 * Does not: register React elements or fetch page data.
 */
export const ROUTES = {
  root: "/",
  tonight: "/tonight",
  queue: "/queue",
  workflow: "/workflow",
  memory: "/memory",
  activity: "/activity",
  settings: "/settings",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
