/**
 * Primary destinations for FigJam 04 Mobile bottom nav.
 * `more` opens a sheet instead of a page.
 */
export type PrimaryNavId = "tonight" | "queue" | "workflow" | "activity" | "more";

/**
 * Routes the mobile/tablet shell can show without owning desktop page files.
 */
export type ShellRoute =
  | "tonight"
  | "queue"
  | "workflow"
  | "activity"
  | "memory"
  | "settings"
  | "settings-vault"
  | "settings-connectivity"
  | "settings-keys";

/** One item in the five-tab bar. */
export type NavItem = {
  id: PrimaryNavId;
  label: string;
  route?: ShellRoute;
};

/**
 * Tonight, Queue, Workflow, Activity, More — labels match FigJam 04.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { id: "tonight", label: "Tonight", route: "tonight" },
  { id: "queue", label: "Queue", route: "queue" },
  { id: "workflow", label: "Workflow", route: "workflow" },
  { id: "activity", label: "Activity", route: "activity" },
  { id: "more", label: "More" },
] as const;

/** More sheet: Memory, Activity, Settings (vault, connectivity, API keys). */
export const MORE_LINKS: ReadonlyArray<{
  route: ShellRoute;
  label: string;
  hint: string;
}> = [
  { route: "memory", label: "Memory", hint: "CV slice, voice samples, requirements" },
  { route: "activity", label: "Activity", hint: "Run log and letter events" },
  { route: "settings", label: "Settings", hint: "Vault, connectivity, API keys" },
];

/** Nested settings rows shown under Settings. */
export const SETTINGS_LINKS: ReadonlyArray<{
  route: ShellRoute;
  label: string;
  hint: string;
}> = [
  { route: "settings-vault", label: "Vault", hint: "Obsidian folder on this machine" },
  {
    route: "settings-connectivity",
    label: "Connectivity",
    hint: "Local IPC and Remote Bridge",
  },
  { route: "settings-keys", label: "API keys", hint: "Write-only; never shown back" },
];

/**
 * Title shown in the mobile header for the active route.
 */
export function titleForRoute(route: ShellRoute): string {
  switch (route) {
    case "tonight":
      return "Tonight";
    case "queue":
      return "Queue";
    case "workflow":
      return "Workflow";
    case "activity":
      return "Activity";
    case "memory":
      return "Memory";
    case "settings":
      return "Settings";
    case "settings-vault":
      return "Vault";
    case "settings-connectivity":
      return "Connectivity";
    case "settings-keys":
      return "API keys";
  }
}

/**
 * Whether the More tab should look selected.
 */
export function isMoreRoute(route: ShellRoute): boolean {
  return route === "memory" || route.startsWith("settings");
}
