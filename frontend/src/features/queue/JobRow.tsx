import { MatchScore } from "./MatchScore";
import { SourceBadge } from "./SourceBadge";
import { StatusChip } from "./StatusChip";
import type { JobRecord } from "./types";
import styles from "./JobRow.module.css";

type JobRowProps = {
  job: JobRecord;
  selected: boolean;
  onSelect: (sourceId: string) => void;
};

/** One job in the Queue list: title, status chip, source badge, match score. */
export function JobRow({ job, selected, onSelect }: JobRowProps) {
  return (
    <button
      type="button"
      className={styles.row}
      aria-current={selected || undefined}
      onClick={() => onSelect(job.source_id)}
      data-testid="job-row"
      data-source-id={job.source_id}
    >
      <div>
        <div className={styles.meta}>
          <StatusChip status={job.status} />
          <SourceBadge source={job.source} />
        </div>
        <h3 className={styles.title}>{job.title}</h3>
        <p className={styles.sub}>
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
        </p>
      </div>
      <MatchScore score={job.score} />
    </button>
  );
}
