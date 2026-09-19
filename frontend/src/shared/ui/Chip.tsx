import type { HTMLAttributes, ReactNode } from "react";

type ChipTone = "neutral" | "accent" | "ok" | "warning" | "danger" | "policy" | "muted";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  dot?: boolean;
  pulse?: boolean;
  /** 28px pill used in the header heartbeat; default is the 19px inline pill. */
  size?: "sm" | "lg";
  children: ReactNode;
}

/**
 * Purpose: Compact status / count pill used in nav, cards and the header.
 * Does not: compute queue contents or heartbeat from the vault.
 */
export function Chip({
  tone = "neutral",
  dot = false,
  pulse = false,
  size = "sm",
  className,
  children,
  ...rest
}: ChipProps) {
  const classes = [
    "chip",
    `chip--${tone}`,
    size === "lg" ? "chip--lg" : "",
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
