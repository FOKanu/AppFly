import { Link } from "react-router-dom";
import { Score } from "../../shared/ui/Score";
import { ROUTES } from "../../routes";
import { JOB_STATUSES, type JobRecord, type JobStatus } from "./types";

interface KanbanBoardProps {
  jobs: JobRecord[];
  selectedId: string | null;
  onSelect: (sourceId: string) => void;
  /** Move a card to another column. */
  onMove: (job: JobRecord, status: JobStatus) => void;
}

/**
 * Purpose: The queue as one column per status, for seeing the whole pipeline
 *          at once rather than one job at a time.
 * Does not: submit anything — moving a card only sets the vault status, the
 *           same write the list view performs.
 */
export function KanbanBoard({ jobs, selectedId, onSelect, onMove }: KanbanBoardProps) {
  return (
    <div className="kanban" role="list" aria-label="Queue by status">
      {JOB_STATUSES.map((status) => {
        const column = jobs.filter((job) => job.status === status);
        return (
          <section className="kanban__column" key={status} aria-label={status}>
            <header className="kanban__head">
              <span className="kanban__dot" data-status={status} aria-hidden="true" />
              <span className="kanban__name">{status}</span>
              <span className="kanban__count">{column.length}</span>
            </header>

            <div className="kanban__cards">
              {column.length === 0 ? (
                <p className="kanban__empty">—</p>
              ) : (
                column.map((job) => (
                  <article
                    key={job.source_id}
                    className={
                      job.source_id === selectedId ? "kanban-card is-selected" : "kanban-card"
                    }
                  >
                    <button
                      type="button"
                      className="kanban-card__main"
                      onClick={() => onSelect(job.source_id)}
                    >
                      <span className="kanban-card__title">{job.title}</span>
                      <span className="kanban-card__company">{job.company}</span>
                    </button>

                    <footer className="kanban-card__foot">
                      <Score value={toTen(job.score)} size="sm" />
                      <label className="kanban-card__move">
                        <span className="menu__sr-only">Move {job.title} to</span>
                        <select
                          value={job.status}
                          onChange={(event) =>
                            onMove(job, event.target.value as JobStatus)
                          }
                        >
                          {JOB_STATUSES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Link
                        className="kanban-card__open"
                        to={`${ROUTES.packet}/${encodeURIComponent(job.source_id)}`}
                        aria-label={`Open packet for ${job.title}`}
                      >
                        ↗
                      </Link>
                    </footer>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Matcher scores arrive as a 0–1 cosine; cards print 0–10. */
function toTen(score: number | null): number | null {
  if (score == null) return null;
  return score <= 1 ? Math.round(score * 100) / 10 : score;
}
