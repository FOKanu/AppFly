import { MatchScore } from "./MatchScore";
import { SourceBadge } from "./SourceBadge";
import { StatusChip } from "./StatusChip";
import type { JobRecord } from "./types";

type JobRowProps = {
  job: JobRecord;
  selected: boolean;
  checked: boolean;
  onSelect: (sourceId: string) => void;
  onToggleChecked: (sourceId: string) => void;
};

/**
 * Purpose: One queue row — tick box, title, company/location, status and source
 *          chips, match score and age.
 * Does not: fetch the listing URL, even when crawl_allowed is true.
 */
export function JobRow({ job, selected, checked, onSelect, onToggleChecked }: JobRowProps) {
  return (
    <div className={selected ? "job-row is-selected" : "job-row"}>
      <input
        type="checkbox"
        className="job-row__check"
        checked={checked}
        onChange={() => onToggleChecked(job.source_id)}
        aria-label={`Select ${job.title}`}
      />

      <button
        type="button"
        className="job-row__main"
        aria-current={selected || undefined}
        onClick={() => onSelect(job.source_id)}
        data-testid="job-row"
        data-source-id={job.source_id}
      >
        <span className="job-row__title">{job.title}</span>
        <span className="job-row__sub">
          {job.company}
          {job.location ? ` · ${job.location}` : ""}
        </span>
        <span className="job-row__meta">
          <StatusChip status={job.status} />
          <SourceBadge source={job.source} />
          {job.lang ? <span className="tag">{job.lang.toUpperCase()}</span> : null}
          {job.crawl_allowed ? null : (
            <span className="tag tag--policy">clip · not fetched</span>
          )}
        </span>
      </button>

      <span className="job-row__score">
        <MatchScore score={job.score} />
        <span className="job-row__age">{job.posted || "—"}</span>
      </span>
    </div>
  );
}
