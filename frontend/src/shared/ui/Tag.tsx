import type { ReactNode } from "react";

interface TagProps {
  tone?: "neutral" | "accent" | "policy";
  className?: string;
  children: ReactNode;
}

/**
 * Purpose: Small mono outline label for source, language, ref and model names.
 * Does not: carry status colour — use StatusChip for job status.
 */
export function Tag({ tone = "neutral", className, children }: TagProps) {
  const classes = ["tag", tone === "neutral" ? "" : `tag--${tone}`, className]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{children}</span>;
}
