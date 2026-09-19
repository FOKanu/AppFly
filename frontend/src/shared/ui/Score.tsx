interface ScoreProps {
  /** Match score out of 10, or null when the job has not been scored yet. */
  value: number | null | undefined;
  size?: "md" | "sm";
  className?: string;
}

/** Below this the pill turns amber — mirrors the 7.0 shortlist threshold. */
const SHORTLIST_THRESHOLD = 7;

/**
 * Purpose: Boxed match score, amber under the shortlist threshold.
 * Does not: compute the score; the matcher owns that.
 */
export function Score({ value, size = "md", className }: ScoreProps) {
  const low = typeof value === "number" && value < SHORTLIST_THRESHOLD;
  const classes = [
    "score",
    size === "sm" ? "score--sm" : "",
    low ? "score--low" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{typeof value === "number" ? value.toFixed(1) : "—"}</span>;
}
