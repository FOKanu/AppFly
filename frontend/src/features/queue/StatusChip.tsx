import type { JobStatus } from "./types";

type StatusChipProps = {
  status: JobStatus;
};

/**
 * Purpose: Colored status pill for a queue row (inbox → applied, or skipped).
 * Does not: change the status; QueuePage owns the PATCH.
 */
export function StatusChip({ status }: StatusChipProps) {
  return (
    <span className="status-chip" data-testid="status-chip" data-status={status}>
      <span className="status-chip__dot" aria-hidden="true" />
      {status}
    </span>
  );
}
