/**
 * Mobile and tablet chrome for Jobhunt Copilot (FigJam 03 / 04).
 * Prefer these files over rewriting desktop pages owned by other agents.
 */
export { ResponsiveShell } from "./ResponsiveShell";
export { MobileShell, type MobileShellProps } from "./MobileShell";
export { TabletShell, type TabletShellProps } from "./TabletShell";
export { BottomNav, NavGlyph, type BottomNavProps } from "./BottomNav";
export { MoreMenu, type MoreMenuProps } from "./MoreMenu";
export {
  PRIMARY_NAV,
  MORE_LINKS,
  SETTINGS_LINKS,
  titleForRoute,
  isMoreRoute,
  type ShellRoute,
  type PrimaryNavId,
  type NavItem,
} from "./nav";
export {
  ShellScreen,
  PolicyAside,
  fixtureFromSearch,
  type EdgeFixture,
} from "./screens";
