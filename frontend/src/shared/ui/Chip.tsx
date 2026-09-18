import type { HTMLAttributes, ReactNode } from "react";

type ChipTone = "neutral" | "accent" | "warning" | "danger" | "muted";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
}

/**
 * Purpose: Compact status / count pill used in nav and the header.
 * Does not: compute queue contents or heartbeat from the vault.
 */
export function Chip({
  tone = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
  ...rest
}: ChipProps) {
  const classes = [
    "chip",
    `chip--${tone}`,
    pulse ? "chip--pulse" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...rest}>
      {dot ? <span className="chip__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
