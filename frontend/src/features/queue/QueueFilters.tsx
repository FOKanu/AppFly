import { JOB_SOURCES, JOB_STATUSES } from "./types";
import type { JobStatus } from "./types";
import type { QueueFilterState } from "./filterJobs";
import { SOURCE_LABELS } from "./filterJobs";
import styles from "./QueueFilters.module.css";

type QueueFiltersProps = {
  value: QueueFilterState;
  onChange: (next: QueueFilterState) => void;
};

/** Status chips and source select for the Queue list. */
export function QueueFilters({ value, onChange }: QueueFiltersProps) {
  return (
    <div className={styles.filters} data-testid="queue-filters">
      <div className={styles.group}>
        <span className={styles.label}>Status</span>
        <div className={styles.chips} role="group" aria-label="Filter by status">
          <button
            type="button"
            className={styles.chip}
            aria-pressed={value.status === "all"}
            onClick={() => onChange({ ...value, status: "all" })}
          >
            All
          </button>
          {JOB_STATUSES.map((status: JobStatus) => (
            <button
              key={status}
              type="button"
              className={styles.chip}
              aria-pressed={value.status === status}
              onClick={() => onChange({ ...value, status })}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      <label className={styles.group}>
        <span className={styles.label}>Source</span>
        <select
          className={styles.select}
          value={value.source}
          onChange={(event) => onChange({ ...value, source: event.target.value })}
          aria-label="Filter by source"
        >
          <option value="all">All sources</option>
          {JOB_SOURCES.map((source) => (
            <option key={source} value={source}>
              {SOURCE_LABELS[source]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
