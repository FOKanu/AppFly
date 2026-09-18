import { Link } from "react-router-dom";
import { MatchScore } from "./MatchScore";
import { SourceBadge } from "./SourceBadge";
import { StatusChip } from "./StatusChip";
import type { JobRecord } from "./types";
import styles from "./QueueDetail.module.css";

type QueueDetailProps = {
  job: JobRecord | null;
};

/** Detail pane for the selected queue job (not the whole vault). */
export function QueueDetail({ job }: QueueDetailProps) {
  if (!job) {
    return (
      <aside className={styles.pane} data-testid="queue-detail">
        <p className={styles.empty}>Select a job to inspect it.</p>
      </aside>
    );
  }

  return (
    <aside className={styles.pane} data-testid="queue-detail">
      <div className={styles.kicker}>
        <StatusChip status={job.status} />
        <SourceBadge source={job.source} />
        <div className={styles.scoreWrap}>
          <MatchScore score={job.score} />
        </div>
      </div>
      <h2 className={styles.title}>{job.title}</h2>
      <p className={styles.sub}>
        {job.company}
        {job.location ? ` · ${job.location}` : ""}
        {job.salary ? ` · ${job.salary}` : ""}
      </p>
      <p className={styles.body}>{job.description || "No description excerpt."}</p>
      {!job.crawl_allowed ? (
        <p className={styles.warn}>
          crawl_allowed is false. Copilot will not fetch this listing. Open it yourself or clip it into
          _inbox/.
        </p>
      ) : null}
      <div className={styles.actions}>
        <Link className={styles.primary} to={`/packet/${encodeURIComponent(job.source_id)}`}>
          Open packet
        </Link>
        {job.url ? (
          <a className={styles.ghost} href={job.url} target="_blank" rel="noreferrer">
            Open listing
          </a>
        ) : null}
      </div>
      <p className={styles.note}>
        You submit applications in your own browser. There is no Easy Apply bot.
      </p>
    </aside>
  );
}
