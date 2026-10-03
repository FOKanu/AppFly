type MeterTone = "approved" | "accent" | "shortlist" | "draft" | "applied";

interface MeterProps {
  /** 0–1, or null when there is no value (not scored). */
  value: number | null;
  tone?: MeterTone;
  className?: string;
  label?: string;
}

/**
 * Purpose: Horizontal bar for the match score and the conversion funnel.
 * Does not: format the numeric value beside it; callers render that.
 */
export function Meter({ value, tone = "approved", className, label }: MeterProps) {
  const pct = value === null ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 100);
  const classes = ["meter", className].filter(Boolean).join(" ");
  return (
    <div
      className={classes}
      role="meter"
      aria-valuenow={value === null ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={value === null ? "Not scored" : undefined}
    >
      <span className="meter__fill" data-tone={tone} style={{ width: `${pct}%` }} />
    </div>
  );
}
