import { JobRow } from "./JobRow";
import type { JobRecord } from "./types";
import styles from "./JobList.module.css";

type JobListProps = {
  jobs: JobRecord[];
  selectedId: string | null;
  onSelect: (sourceId: string) => void;
};

/** Scrollable master list of queue jobs. */
export function JobList({ jobs, selectedId, onSelect }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className={styles.list} data-testid="job-list">
        <p className={styles.empty}>No jobs match these filters.</p>
      </div>
    );
  }

  return (
    <div className={styles.list} role="list" data-testid="job-list">
      {jobs.map((job) => (
        <div key={job.source_id} role="listitem">
          <JobRow job={job} selected={job.source_id === selectedId} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}
