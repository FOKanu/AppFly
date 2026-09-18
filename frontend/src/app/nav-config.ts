import { ROUTES, type RoutePath } from "../routes";

export interface NavItem {
  id: string;
  index: string;
  label: string;
  path: RoutePath;
  showCount?: boolean;
}

/**
 * Purpose: Single source of sidebar / bottom-nav items and their routes.
 * Does not: render chrome or load queue/tonight payloads.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "tonight", index: "01", label: "Tonight", path: ROUTES.tonight },
  { id: "queue", index: "02", label: "Queue", path: ROUTES.queue, showCount: true },
  { id: "workflow", index: "03", label: "Workflow", path: ROUTES.workflow },
  { id: "memory", index: "04", label: "Memory & profiles", path: ROUTES.memory },
  { id: "activity", index: "05", label: "Activity & logs", path: ROUTES.activity },
  { id: "settings", index: "06", label: "Settings", path: ROUTES.settings },
];

/**
 * Purpose: Resolve the nav item for the current pathname.
 * Does not: default-redirect; the router handles "/".
 */
export function navItemForPath(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.path === pathname);
}
