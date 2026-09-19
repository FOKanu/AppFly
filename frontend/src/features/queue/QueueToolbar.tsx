import { Segmented } from "../../shared/ui/Segmented";
import { JOB_SOURCES, JOB_STATUSES, type JobStatus } from "./types";
import { activeFilterCount, sourceLabel, type QueueFilterState } from "./filterJobs";

/** How the queue is laid out. */
export type QueueView = "list" | "kanban";

/** Sort orders the toolbar offers. */
export type QueueSort = "score" | "age";

interface QueueToolbarProps {
  filters: QueueFilterState;
  onFilters: (next: QueueFilterState) => void;
  onReset: () => void;
  /** Row count per status, for the tab badges. */
  counts: Record<JobStatus | "all", number>;
  view: QueueView;
  onView: (next: QueueView) => void;
  sort: QueueSort;
  onSort: (next: QueueSort) => void;
  /** Active search-preset profile, shown as context. */
  profileName: string;
}

const VIEWS = [
  { value: "list", label: "List" },
  { value: "kanban", label: "Kanban" },
] as const;

const SORTS = [
  { value: "score", label: "Score" },
  { value: "age", label: "Age" },
] as const;

/** Score floors the toolbar offers, matching the shortlist threshold. */
const SCORE_STEPS = [null, 7, 8, 9] as const;

const LANGUAGES = ["DE", "EN"] as const;

/**
 * Purpose: Queue toolbar — status tabs with counts, view/sort, and the filters
 *          that actually narrow the list.
 * Does not: filter the rows itself; QueuePage applies `filters`.
 */
export function QueueToolbar({
  filters,
  onFilters,
  onReset,
  counts,
  view,
  onView,
  sort,
  onSort,
  profileName,
}: QueueToolbarProps) {
  const active = activeFilterCount(filters);

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
        <Segmented
          options={SORTS}
          value={sort}
          onChange={onSort}
          ariaLabel="Sort order"
        />
      </div>

      <div className="queue-toolbar__row">
        {/* Score floor cycles through the offered steps. */}
        <button
          type="button"
          className={filters.minScore === null ? "filter-pill" : "filter-pill is-active"}
          onClick={() => onFilters({ ...filters, minScore: nextScore(filters.minScore) })}
        >
          <span className="filter-pill__label">Score</span>
          <span className="filter-pill__value">
            {filters.minScore === null ? "Any" : `≥ ${filters.minScore.toFixed(1)}`}
          </span>
          <span className="filter-pill__caret" aria-hidden="true">
            ⌄
          </span>
        </button>

        <span
          className={
            filters.languages.length === 0 ? "filter-pill" : "filter-pill is-active"
          }
        >
          <span className="filter-pill__label">Language</span>
          {LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              className={
                filters.languages.includes(language)
                  ? "filter-pill__toggle is-on"
                  : "filter-pill__toggle"
              }
              aria-pressed={filters.languages.includes(language)}
              onClick={() =>
                onFilters({
                  ...filters,
                  languages: filters.languages.includes(language)
                    ? filters.languages.filter((item) => item !== language)
                    : [...filters.languages, language],
                })
              }
            >
              {language}
            </button>
          ))}
        </span>

        <span className={filters.source === "all" ? "filter-pill" : "filter-pill is-active"}>
          <span className="filter-pill__label">Source</span>
          <select
            className="filter-pill__select"
            value={filters.source}
            aria-label="Filter by source"
            onChange={(event) => onFilters({ ...filters, source: event.target.value })}
          >
            <option value="all">Any</option>
            {JOB_SOURCES.map((source) => (
              <option key={source} value={source}>
                {sourceLabel(source)}
              </option>
            ))}
          </select>
        </span>

        <span
          className={filters.location.trim() ? "filter-pill is-active" : "filter-pill"}
        >
          <span className="filter-pill__label">Location</span>
          <input
            className="filter-pill__input"
            value={filters.location}
            placeholder="Any"
            aria-label="Filter by location"
            onChange={(event) => onFilters({ ...filters, location: event.target.value })}
          />
        </span>

        <button
          type="button"
          className="queue-toolbar__reset"
          disabled={active === 0}
          onClick={onReset}
        >
          Clear {active > 0 ? `(${active})` : ""}
        </button>

        <span className="queue-toolbar__spacer" />

        <p className="queue-toolbar__hints">
          Profile {profileName} · J / K move · X select
        </p>
      </div>
    </div>
  );
}

/** Cycle Any → 7.0 → 8.0 → 9.0 → Any. */
function nextScore(current: number | null): number | null {
  const index = SCORE_STEPS.findIndex((step) => step === current);
  return SCORE_STEPS[(index + 1) % SCORE_STEPS.length];
}
