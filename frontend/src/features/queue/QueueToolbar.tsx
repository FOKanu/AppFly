import { Segmented } from "../../shared/ui/Segmented";
import { JOB_STATUSES, type JobStatus } from "./types";
import type { QueueFilterState } from "./filterJobs";

/** How the queue is laid out. Kanban is designed but not built yet. */
export type QueueView = "list" | "kanban";

/** Sort orders the toolbar offers. */
export type QueueSort = "score" | "age";

interface QueueToolbarProps {
  filters: QueueFilterState;
  onFilters: (next: QueueFilterState) => void;
  /** Row count per status, for the tab badges. */
  counts: Record<JobStatus | "all", number>;
  view: QueueView;
  onView: (next: QueueView) => void;
  sort: QueueSort;
  onSort: (next: QueueSort) => void;
  /** Active search-preset profile, shown as a filter pill. */
  profileName: string;
}

const VIEWS = [
  { value: "list", label: "List" },
  { value: "kanban", label: "Kanban" },
] as const;

/**
 * Purpose: Queue toolbar — status tabs with counts, view/sort controls, the
 *          active filter pills, and the keyboard hints.
 * Does not: filter the rows itself; QueuePage applies `filters`.
 */
export function QueueToolbar({
  filters,
  onFilters,
  counts,
  view,
  onView,
  sort,
  onSort,
  profileName,
}: QueueToolbarProps) {
  return (
    <div className="queue-toolbar" data-testid="queue-filters">
      <div className="queue-toolbar__row">
        <div className="status-tabs" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={filters.status === "all" ? "status-tab is-active" : "status-tab"}
            aria-pressed={filters.status === "all"}
            onClick={() => onFilters({ ...filters, status: "all" })}
          >
            All <span className="status-tab__count">{counts.all}</span>
          </button>
          {JOB_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={filters.status === status ? "status-tab is-active" : "status-tab"}
              aria-pressed={filters.status === status}
              data-status={status}
              onClick={() => onFilters({ ...filters, status })}
            >
              <span className="status-tab__dot" aria-hidden="true" />
              {status} <span className="status-tab__count">{counts[status]}</span>
            </button>
          ))}
        </div>

        <span className="queue-toolbar__spacer" />

        <Segmented options={VIEWS} value={view} onChange={onView} ariaLabel="Queue view" />
        <button
          type="button"
          className="queue-toolbar__sort"
          onClick={() => onSort(sort === "score" ? "age" : "score")}
        >
          Sort: {sort} ↓
        </button>
      </div>

      <div className="queue-toolbar__row">
        <FilterPill label="Score" value="≥ 7.0" removable />
        <FilterPill label="Language" value="DE + EN" />
        <FilterPill
          label="Source"
          value={filters.source === "all" ? "Any" : filters.source}
          onClear={
            filters.source === "all" ? undefined : () => onFilters({ ...filters, source: "all" })
          }
          removable={filters.source !== "all"}
          active={filters.source !== "all"}
        />
        <FilterPill label="Location" value="Berlin, Remote DACH" removable active />
        <FilterPill label="Profile" value={profileName} />
        <button type="button" className="queue-toolbar__add-filter">
          + Filter
        </button>

        <span className="queue-toolbar__spacer" />

        <p className="queue-toolbar__hints">J / K move · X select · ⇧A approve selected</p>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  value,
  removable = false,
  active = false,
  onClear,
}: {
  label: string;
  value: string;
  removable?: boolean;
  active?: boolean;
  onClear?: () => void;
}) {
  return (
    <span className={active ? "filter-pill is-active" : "filter-pill"}>
      <span className="filter-pill__label">{label}</span>
      <span className="filter-pill__value">{value}</span>
      {removable ? (
        <button
          type="button"
          className="filter-pill__clear"
          aria-label={`Clear ${label} filter`}
          onClick={onClear}
        >
          ×
        </button>
      ) : (
        <span className="filter-pill__caret" aria-hidden="true">
          ⌄
        </span>
      )}
    </span>
  );
}
