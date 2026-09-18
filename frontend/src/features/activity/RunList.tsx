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
  if (runs.length === 0) {
    return <p className="empty">No runs yet. Nightly `jobhunt run` notes will land here.</p>;
  }
  return (
    <ul className="runs">
      {runs.map((run) => (
        <li key={run.id}>
          <RunRow run={run} />
        </li>
      ))}
    </ul>
  );
}
