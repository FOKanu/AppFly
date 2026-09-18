/**
 * Layout buckets aligned with FigJam 04 Mobile (390) and 03 Tablet (768).
 * 390 is a design target inside the mobile bucket, not its own breakpoint.
 */
export type Breakpoint = "mobile" | "tablet" | "desktop";

/** Minimum widths in CSS pixels for tablet and desktop shells. */
export const BREAKPOINT_MIN_WIDTH = {
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Map a viewport width to the shell the copilot should use.
 * Mobile is a single column; tablet gains a rail and optional aside.
 */
export function breakpointFromWidth(width: number): Breakpoint {
  if (width >= BREAKPOINT_MIN_WIDTH.desktop) return "desktop";
  if (width >= BREAKPOINT_MIN_WIDTH.tablet) return "tablet";
  return "mobile";
}

/**
 * True when the viewport should use the FigJam 04 single-column shell.
 */
export function isMobileWidth(width: number): boolean {
  return breakpointFromWidth(width) === "mobile";
}
