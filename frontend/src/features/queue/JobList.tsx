import { Button } from "../../shared/ui/Button";
import { JobRow } from "./JobRow";
import type { JobRecord } from "./types";

type JobListProps = {
  jobs: JobRecord[];
  selectedId: string | null;
  onSelect: (sourceId: string) => void;
  /** Rows ticked for a bulk action. */
  checkedIds: ReadonlySet<string>;
  onToggleChecked: (sourceId: string) => void;
  onClearChecked: () => void;
  onApproveChecked: () => void;
  onSkipChecked: () => void;
};

/**
 * Purpose: Master list pane — bulk bar, a Drafts group, then everything else.
 * Does not: mutate job status; QueuePage owns the PATCH calls.
 */
export function JobList({
  jobs,
  selectedId,
  onSelect,
  checkedIds,
  onToggleChecked,
  onClearChecked,
  onApproveChecked,
  onSkipChecked,
}: JobListProps) {
  const drafts = jobs.filter((job) => job.status === "draft");
  const others = jobs.filter((job) => job.status !== "draft");

  return (
    <div className="job-list" data-testid="job-list">
      <div className="job-list__bulk">
        <label className="job-list__bulk-check">
          <input
            type="checkbox"
            checked={checkedIds.size > 0}
            onChange={onClearChecked}
            aria-label="Clear selection"
          />
          <span>{checkedIds.size} selected</span>
        </label>
        <Button
          variant="approve"
          size="sm"
          shortcut="⇧A"
          disabled={checkedIds.size === 0}
          onClick={onApproveChecked}
        >
          Approve
        </Button>
        <Button
          variant="quiet"
          size="sm"
          shortcut="⇧D"
          disabled={checkedIds.size === 0}
          onClick={onSkipChecked}
        >
          Skip
        </Button>
      </div>

      {jobs.length === 0 ? (
        <p className="job-list__empty">No jobs match these filters.</p>
      ) : (
        <div className="job-list__scroll" role="list">
          {drafts.length > 0 ? (
            <>
              <GroupHeader label={`Drafts · ${drafts.length}`} />
              {drafts.map((job) => (
                <div key={job.source_id} role="listitem">
                  <JobRow
                    job={job}
                    selected={job.source_id === selectedId}
                    checked={checkedIds.has(job.source_id)}
                    onSelect={onSelect}
                    onToggleChecked={onToggleChecked}
                  />
                </div>
              ))}
            </>
          ) : null}

          {others.length > 0 ? (
            <>
              <GroupHeader label="Other statuses" />
              {others.map((job) => (
                <div key={job.source_id} role="listitem">
                  <JobRow
                    job={job}
                    selected={job.source_id === selectedId}
                    checked={checkedIds.has(job.source_id)}
                    onSelect={onSelect}
                    onToggleChecked={onToggleChecked}
                  />
                </div>
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GroupHeader({ label }: { label: string }) {
  return (
    <p className="job-list__group">
      <span>{label}</span>
      <span>Score</span>
    </p>
  );
}
