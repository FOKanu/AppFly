import type { CSSProperties, ReactNode } from "react";
import { FeatureStub } from "./shared/ui/FeatureStub";
import { tokens } from "./shared/ui/tokens";

/**
 * Purpose: Hold app-wide providers (token canvas today; query/auth later).
 * Inputs: React children.
 * Returns: Full-viewport tree with CSS variables from `tokens.ts`.
 * Does not: Render feature routes or call the API.
 */
function AppProviders({ children }: { children: ReactNode }) {
  const canvasStyle = {
    "--color-canvas": tokens.color.canvas,
    "--color-panel": tokens.color.panel,
    "--color-raised": tokens.color.raised,
    "--color-control": tokens.color.control,
    "--color-border": tokens.color.border,
    "--color-border-strong": tokens.color.borderStrong,
    "--color-text": tokens.color.text,
    "--color-text-muted": tokens.color.textMuted,
    "--color-text-faint": tokens.color.textFaint,
    "--color-accent": tokens.color.accent,
    minHeight: "100vh",
    background: tokens.color.canvas,
    color: tokens.color.text,
    fontFamily: tokens.font.sans,
  } as CSSProperties;

  return <div style={canvasStyle}>{children}</div>;
}

/**
 * Purpose: Root UI mount for the instrument panel.
 * Inputs: None.
 * Returns: Providers wrapping a shell stub (no feature pages).
 * Does not: Implement Tonight, Queue, Packet, or Settings screens.
 */
export default function App() {
  return (
    <AppProviders>
      <FeatureStub
        title="Shell only"
        detail="Feature screens (Tonight, Queue, Packet, Workflow, Memory, Activity, Settings) land in later packages. This app mounts providers and design tokens."
      />
    </AppProviders>
  );
}
