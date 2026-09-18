/**
 * Purpose: Design tokens for the dark calm instrument panel.
 * Does not: encode copy, crawl policy, or API payloads.
 */
export const tokens = {
  color: {
    bg: "#0c0f0e",
    bgRaised: "#121715",
    bgPanel: "#161b19",
    bgHover: "#1c2320",
    bgActive: "#1a2622",
    border: "#24302b",
    borderStrong: "#31433b",
    text: "#dce6e1",
    textMuted: "#8b9a93",
    textFaint: "#5c6b64",
    accent: "#3dba9a",
    accentDim: "#1f6f5c",
    accentGlow: "rgba(61, 186, 154, 0.28)",
    warning: "#d4a017",
    warningGlow: "rgba(212, 160, 23, 0.28)",
    danger: "#d46767",
    info: "#6a9cbf",
    idle: "#4a5852",
    status: {
      inbox: "#B8C0CC",
      shortlist: "#7EA6FF",
      draft: "#E9A23B",
      approved: "#45C486",
      applied: "#A98BFA",
      skipped: "#7C8795",
    },
  },
  radius: 7,
  controlHeight: 32,
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
  },
  type: {
    sans: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
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
  return {
    "--bg": source.color.bg,
    "--bg-raised": source.color.bgRaised,
    "--bg-panel": source.color.bgPanel,
    "--bg-hover": source.color.bgHover,
    "--bg-active": source.color.bgActive,
    "--border": source.color.border,
    "--border-strong": source.color.borderStrong,
    "--text": source.color.text,
    "--text-muted": source.color.textMuted,
    "--text-faint": source.color.textFaint,
    "--accent": source.color.accent,
    "--accent-dim": source.color.accentDim,
    "--accent-glow": source.color.accentGlow,
    "--warning": source.color.warning,
    "--warning-glow": source.color.warningGlow,
    "--danger": source.color.danger,
    "--info": source.color.info,
    "--idle": source.color.idle,
    "--radius": `${source.radius}px`,
    "--control-h": `${source.controlHeight}px`,
    "--font-sans": source.type.sans,
    "--font-mono": source.type.mono,
    "--bp-mobile": `${source.breakpoint.mobile}px`,
    "--bp-tablet": `${source.breakpoint.tablet}px`,
    "--bp-tablet-max": `${source.breakpoint.tabletMax}px`,
    "--bp-compact": `${source.breakpoint.compact}px`,
    "--bp-desktop": `${source.breakpoint.desktop}px`,
    "--ink": source.color.text,
    "--ink-soft": source.color.textMuted,
    "--paper": source.color.bg,
    "--paper-raised": source.color.bgPanel,
    "--paper-sunken": source.color.bgRaised,
    "--line": source.color.border,
    "--shadow": "none",
    "--forest": source.color.accent,
    "--copper": source.color.warning,
    "--copper-ink": source.color.bg,
    "--muted": source.color.textMuted,
    "--bg-elevated": source.color.bgRaised,
    "--warn": source.color.warning,
    "--ok": source.color.accent,
    "--err": source.color.danger,
    "--chip": source.color.bgHover,
    "--mono": source.type.mono,
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
