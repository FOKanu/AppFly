import { requestListingFetch } from "../queue/jobsApi";
import type { JobRecord, JobStatus } from "../queue/types";
import styles from "./PacketActions.module.css";

type PacketActionsProps = {
  job: JobRecord;
  busy: boolean;
  feedback: string | null;
  onStatus: (status: JobStatus) => void;
  onFeedback: (message: string) => void;
};

/**
 * Human actions for a sealed packet: approve, skip, open listing.
 * Fetch listing is offered only when crawl_allowed is true, and never hits the listing URL.
 */
export function PacketActions({ job, busy, feedback, onStatus, onFeedback }: PacketActionsProps) {
  async function onFetchListing() {
    const result = await requestListingFetch(job.source_id, job.crawl_allowed);
    onFeedback(result.message);
  }

  return (
    <div className={styles.bar} data-testid="packet-actions">
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.approve}
          disabled={busy || job.status === "applied"}
          onClick={() => onStatus("approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className={styles.skip}
          disabled={busy || job.status === "applied"}
          onClick={() => onStatus("skipped")}
        >
          Skip
        </button>
        {job.url ? (
          <a className={styles.link} href={job.url} target="_blank" rel="noreferrer">
            Open listing
          </a>
        ) : null}
        {job.crawl_allowed ? (
          <button type="button" className={styles.fetch} onClick={() => void onFetchListing()}>
            Fetch listing
          </button>
        ) : null}
      </div>
      <p className={styles.human}>
        Submit the application in your own browser. Copilot does not Easy Apply or drive the job board.
      </p>
      {!job.crawl_allowed ? (
        <p className={styles.warn} data-testid="crawl-denied">
          crawl_allowed is false. Fetch listing is hidden so deny-listed hosts are never crawled.
        </p>
      ) : null}
      {feedback ? (
        <p className={styles.feedback} data-testid="packet-feedback">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
