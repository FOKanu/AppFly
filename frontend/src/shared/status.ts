/** Job pipeline statuses used by the vault and local API. */
export const JOB_STATUSES = [
  "inbox",
  "shortlist",
  "draft",
  "approved",
  "applied",
  "skipped",
] as const;

/** Status values shown as chips in the Queue. */
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Purpose: Human label for a status, for chips and sentences. */
export const STATUS_LABELS: Record<JobStatus, string> = { inbox: "Inbox", shortlist: "Shortlist", draft: "Draft", approved: "Approved", applied: "Applied", skipped: "Skipped" };

export function statusLabel(status: JobStatus | string): string {
  return STATUS_LABELS[status as JobStatus] ?? status;
}
