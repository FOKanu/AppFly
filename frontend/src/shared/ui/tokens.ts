/**
 * Purpose: Design tokens for the dark instrument panel, mirrored from the
 *          Figma board "UI · 00 Cover & Foundations".
 * Does not: encode copy, crawl policy, or API payloads.
 */
export const tokens = {
  color: {
    /** surface/0 · canvas — app background. */
    surface0: "#0B0D10",
    /** surface/1 · panel — sidebar, cards. */
    surface1: "#111418",
    /** surface/2 · raised — header, list rows. */
    surface2: "#161A20",
    /** surface/3 · control — inputs, buttons. */
    surface3: "#1D222A",
    border: "#232932",
    borderStrong: "#2E3642",
    textPrimary: "#E6E9ED",
    textSecondary: "#A1AAB6",
    textTertiary: "#6B7481",
    /** accent/signal — focus, live run, primary action. */
    accent: "#67D4E3",
    status: {
      inbox: "#B8C0CC",
      shortlist: "#7EA6FF",
      draft: "#E9A23B",
      approved: "#45C486",
      applied: "#A98BFA",
      skipped: "#7C8795",
    },
    signal: {
      error: "#EF4E4E",
      /** Banned host — deliberately distinct from error. */
      policyBlock: "#FF7417",
      warning: "#E9A23B",
    },
  },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 },
  radius: { xs: 4, sm: 7, md: 10, lg: 16, pill: 999 },
  /** Every button, checkbox and row hit area is at least this tall. */
  touchTarget: 44,
  controlHeight: 32,
  layout: {
    sidebarWidth: 232,
    sidebarWidthCompact: 208,
    headerHeight: 60,
    runningBarHeight: 32,
    contentGutter: 24,
  },
  type: {
    sans: '"Inter", "Inter var", system-ui, -apple-system, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
    /** [font-size, line-height, weight, letter-spacing] straight off the Figma scale. */
    scale: {
      display: ["32px", "40px", 600, "-0.01em"],
      titleLg: ["24px", "32px", 600, "-0.01em"],
      titleMd: ["18px", "26px", 600, "0"],
      titleSm: ["15px", "22px", 600, "0"],
      bodyMd: ["15px", "22px", 400, "0"],
      bodySm: ["13px", "20px", 400, "0"],
      labelCaps: ["11px", "16px", 500, "0.06em"],
      monoMd: ["12px", "18px", 400, "0"],
      monoNum: ["20px", "28px", 500, "0"],
    },
  },
  breakpoint: {
    /** Product mobile frame. */
    mobile: 390,
    /** Tablet range start (inclusive). */
    tablet: 768,
    /** Tablet range end (inclusive). */
    tabletMax: 1023,
    /** Compact desktop. */
    compact: 1280,
    /** Primary desktop frame. */
    desktop: 1440,
  },
} as const;

export type Tokens = typeof tokens;

/**
 * Purpose: Layout breakpoints mirrored from the product frames.
 * Does not: apply media queries; CSS consumes these numbers.
 */
export const breakpoints = tokens.breakpoint;

/**
 * Purpose: Flatten tokens into CSS custom properties for :root.
 * Does not: touch the DOM; call applyTokens to assign them.
 */
export function cssVariables(source: Tokens = tokens): Record<string, string> {
  const c = source.color;
  return {
    /* Surfaces & text */
    "--surface-0": c.surface0,
    "--surface-1": c.surface1,
    "--surface-2": c.surface2,
    "--surface-3": c.surface3,
    "--border": c.border,
    "--border-strong": c.borderStrong,
    "--text": c.textPrimary,
    "--text-secondary": c.textSecondary,
    "--text-tertiary": c.textTertiary,
    "--accent": c.accent,
    "--accent-soft": "rgba(103, 212, 227, 0.14)",
    "--accent-glow": "rgba(103, 212, 227, 0.26)",
    /** Text colour to sit on a solid --accent fill. */
    "--accent-ink": c.surface0,

    /* Job status */
    "--status-inbox": c.status.inbox,
    "--status-shortlist": c.status.shortlist,
    "--status-draft": c.status.draft,
    "--status-approved": c.status.approved,
    "--status-applied": c.status.applied,
    "--status-skipped": c.status.skipped,

    /* System signals */
    "--error": c.signal.error,
    "--error-soft": "rgba(239, 78, 78, 0.14)",
    "--policy": c.signal.policyBlock,
    "--policy-soft": "rgba(255, 116, 23, 0.12)",
    "--warning": c.signal.warning,
    "--warning-soft": "rgba(233, 162, 59, 0.14)",
    "--ok-soft": "rgba(69, 196, 134, 0.14)",

    /* Space */
    "--space-1": `${source.space[1]}px`,
    "--space-2": `${source.space[2]}px`,
    "--space-3": `${source.space[3]}px`,
    "--space-4": `${source.space[4]}px`,
    "--space-5": `${source.space[5]}px`,
    "--space-6": `${source.space[6]}px`,
    "--space-7": `${source.space[7]}px`,

    /* Radius */
    "--radius-xs": `${source.radius.xs}px`,
    "--radius-sm": `${source.radius.sm}px`,
    "--radius-md": `${source.radius.md}px`,
    "--radius-lg": `${source.radius.lg}px`,
    "--radius-pill": `${source.radius.pill}px`,
    "--radius": `${source.radius.sm}px`,

    /* Controls & layout */
    "--control-h": `${source.controlHeight}px`,
    "--touch-target": `${source.touchTarget}px`,
    "--sidebar-w": `${source.layout.sidebarWidth}px`,
    "--header-h": `${source.layout.headerHeight}px`,
    "--runbar-h": `${source.layout.runningBarHeight}px`,
    "--gutter": `${source.layout.contentGutter}px`,

    /* Type */
    "--font-sans": source.type.sans,
    "--font-mono": source.type.mono,

    /* Breakpoints (read by JS-free CSS comments / container queries) */
    "--bp-mobile": `${source.breakpoint.mobile}px`,
    "--bp-tablet": `${source.breakpoint.tablet}px`,
    "--bp-tablet-max": `${source.breakpoint.tabletMax}px`,
    "--bp-compact": `${source.breakpoint.compact}px`,
    "--bp-desktop": `${source.breakpoint.desktop}px`,

    /*
     * Legacy aliases. Existing feature stylesheets still read these names;
     * they now resolve to the Figma palette so there is one source of colour.
     */
    "--bg": c.surface0,
    "--bg-raised": c.surface1,
    "--bg-panel": c.surface1,
    "--bg-elevated": c.surface2,
    "--bg-hover": c.surface2,
    "--bg-active": c.surface3,
    "--text-muted": c.textSecondary,
    "--text-faint": c.textTertiary,
    "--accent-dim": "rgba(103, 212, 227, 0.22)",
    "--danger": c.signal.error,
    "--danger-soft": "rgba(239, 78, 78, 0.14)",
    "--info": c.status.shortlist,
    "--info-soft": "rgba(126, 166, 255, 0.14)",
    "--warn": c.signal.warning,
    "--warn-soft": "rgba(233, 162, 59, 0.14)",
    "--idle": c.status.skipped,
    "--ink": c.textPrimary,
    "--ink-soft": c.textSecondary,
    "--ink-muted": c.textSecondary,
    "--muted": c.textSecondary,
    "--paper": c.surface0,
    "--paper-raised": c.surface1,
    "--paper-sunken": c.surface2,
    "--line": c.border,
    "--shadow": "none",
    "--forest": c.status.approved,
    "--copper": c.signal.warning,
    "--copper-ink": c.surface0,
    "--ok": c.status.approved,
    "--err": c.signal.error,
    "--miss": c.signal.error,
    "--off": c.status.skipped,
    "--chip": c.surface3,
    "--card": c.surface1,
    "--mono": source.type.mono,
    "--ok-bg": "rgba(69, 196, 134, 0.14)",
    "--miss-bg": "rgba(239, 78, 78, 0.14)",
    "--off-bg": c.surface2,
  };
}

/**
 * Purpose: Apply token CSS variables onto an element (defaults to documentElement).
 * Does not: load fonts or fetch theme from the API.
 */
export function applyTokens(
  root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement,
): void {
  if (!root) return;
  for (const [name, value] of Object.entries(cssVariables())) {
    root.style.setProperty(name, value);
  }
}
