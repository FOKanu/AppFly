import { RunRow } from "./RunRow";
import type { RunSummary } from "./types";

type RunListProps = {
  runs: RunSummary[];
};

/**
 * Purpose: Render GET /runs history newest-first.
 * Does not: trigger POST /runs or mutate log files.
 */
export function RunList({ runs }: RunListProps) {
  return (
    <section className="activity-card" aria-labelledby="runs-title">
      <p className="activity-card__kicker">Nightly runs</p>
      <h2 id="runs-title" className="activity-card__title">
        Run history
      </h2>

      {runs.length === 0 ? (
        <p className="activity-card__empty">
          No runs yet. Nightly `jobhunt run` notes land here.
        </p>
      ) : (
        <ul className="run-list">
          {runs.map((run) => (
            <li key={run.id}>
              <RunRow run={run} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
