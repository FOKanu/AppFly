import { statusLabel } from "../../features/queue/types";

/** The six job statuses the vault stores, in pipeline order. */
export type JobStatusName =
  | "inbox"
  | "shortlist"
  | "draft"
  | "approved"
  | "applied"
  | "skipped";

interface StatusChipProps {
  status: JobStatusName;
  /** Override the label; defaults to the readable status label ("Shortlist"). */
  label?: string;
  className?: string;
}

/**
 * Purpose: Dot-plus-label pill coloured by job status token.
 * Does not: change a job's status; callers own the mutation.
 */
export function StatusChip({ status, label, className }: StatusChipProps) {
  const classes = ["status-chip", className].filter(Boolean).join(" ");
  return (
    <span className={classes} data-status={status}>
      <span className="status-chip__dot" aria-hidden="true" />
      {label ?? statusLabel(status)}
    </span>
  );
}
