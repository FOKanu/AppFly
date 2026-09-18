/**
 * Purpose: Shared color tokens for the dark instrument-panel UI.
 * Inputs: None (compile-time constants).
 * Returns: A frozen token object other features import.
 * Does not: Fetch theme from the API or persist user preferences.
 */
export const tokens = {
  color: {
    canvas: "#0B0D10",
    panel: "#111418",
    raised: "#161A20",
    control: "#1D222A",
    border: "#232932",
    borderStrong: "#2E3642",
    text: "#E6E9ED",
    textMuted: "#A1AAB6",
    textFaint: "#6B7481",
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
      policyBlock: "#FF7417",
      warning: "#E9A23B",
    },
  },
  font: {
    sans: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
} as const;

export type Tokens = typeof tokens;
