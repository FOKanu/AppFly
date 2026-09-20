import { ROUTES, type RoutePath } from "../routes";

export interface NavItem {
  id: string;
  index: string;
  /** Sidebar label. */
  label: string;
  /** Header title, which is longer than the nav label on some screens. */
  headerTitle: string;
  path: RoutePath;
  showCount?: boolean;
}

/**
 * Purpose: Single source of sidebar / bottom-nav items, their routes and the
 *          header title each route shows.
 * Does not: render chrome or load queue/tonight payloads.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "tonight",
    index: "01",
    label: "Tonight",
    headerTitle: "Tonight",
    path: ROUTES.tonight,
  },
  {
    id: "queue",
    index: "02",
    label: "Queue",
    headerTitle: "Queue",
    path: ROUTES.queue,
    showCount: true,
  },
  {
    id: "workflow",
    index: "03",
    label: "Workflow",
    headerTitle: "Workflow",
    path: ROUTES.workflow,
  },
  {
    id: "vault",
    index: "04",
    label: "Vault",
    headerTitle: "Vault",
    path: ROUTES.vault,
  },
  {
    id: "memory",
    index: "05",
    label: "Memory",
    headerTitle: "Memory",
    path: ROUTES.memory,
  },
  {
    id: "activity",
    index: "06",
    label: "Activity & logs",
    headerTitle: "Activity & logs",
    path: ROUTES.activity,
  },
  {
    id: "settings",
    index: "07",
    label: "Settings",
    headerTitle: "Settings & connectivity",
    path: ROUTES.settings,
  },
];

/**
 * Purpose: Resolve the nav item for the current pathname.
 * Does not: default-redirect; the router handles "/".
 */
export function navItemForPath(pathname: string): NavItem | undefined {
  const exact = NAV_ITEMS.find((item) => item.path === pathname);
  if (exact) return exact;
  return NAV_ITEMS.find(
    (item) => item.path !== ROUTES.root && pathname.startsWith(`${item.path}/`),
  );
}

/** Live values the header breadcrumb interpolates. */
export interface HeaderContext {
  queueCount: number;
  profileName: string;
  profileCount: number;
  /** Already-formatted date, e.g. "Wed 17 Sep". */
  today: string;
  /** Files AppFly holds, for the Vault breadcrumb. */
  documentCount: number;
}

/**
 * Purpose: Breadcrumb / context line above the header title, per the Figma frames.
 * Does not: fetch the values it renders; AppShell supplies them.
 */
export function headerKicker(pathname: string, context: HeaderContext): string {
  if (pathname.startsWith(`${ROUTES.packet}/`)) {
    return "Queue › Drafts › Packet";
  }
  if (pathname.startsWith(ROUTES.profiles)) {
    return `Profiles · ${context.profileName}`;
  }

  const item = navItemForPath(pathname);
  switch (item?.id) {
    case "tonight":
      return `Home · ${context.today}`;
    case "queue":
      return `Queue · ${context.queueCount} jobs · Profile ${context.profileName}`;
    case "workflow":
      return "Workflow · Control plane";
    case "vault":
      return `Vault · ${context.documentCount} file${context.documentCount === 1 ? "" : "s"}`;
    case "memory":
      return "Memory · career ledger";
    case "activity":
      return "Activity · Last 30 days";
    case "settings":
      return "Settings · Local-first";
    default:
      return "Jobhunt Copilot";
  }
}

/**
 * Purpose: Header title for the current route, including the packet detail route
 *          that has no sidebar entry of its own.
 * Does not: read the packet id; the packet screen renders the job title itself.
 */
export function headerTitle(pathname: string): string {
  if (pathname.startsWith(`${ROUTES.packet}/`)) return "Packet detail";
  if (pathname.startsWith(ROUTES.profiles)) return "Profiles";
  return navItemForPath(pathname)?.headerTitle ?? "Jobhunt Copilot";
}
