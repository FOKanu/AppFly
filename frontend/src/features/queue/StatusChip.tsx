import type { JobStatus } from "./types";
import styles from "./StatusChip.module.css";

const LABELS: Record<JobStatus, string> = {
  inbox: "inbox",
  shortlist: "shortlist",
  draft: "draft",
  approved: "approved",
  applied: "applied",
  skipped: "skipped",
};

type StatusChipProps = {
  status: JobStatus;
};

/** Colored status pill for a queue row (inbox → applied, or skipped). */
export function StatusChip({ status }: StatusChipProps) {
  return (
    <span className={`${styles.chip} ${styles[status]}`} data-testid="status-chip" data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
