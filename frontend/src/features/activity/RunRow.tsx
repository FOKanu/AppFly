import type { RunSummary } from "./types";

type RunRowProps = {
  run: RunSummary;
};

/**
 * Purpose: One redacted run-log row (counts, time range, errors).
 * Does not: display API keys or raw vault letters.
 */
export function RunRow({ run }: RunRowProps) {
  return (
    <article className="run">
      <div className="run-head">
        <h3>{run.date || run.id}</h3>
        <span className={run.ok ? "ok" : "fail"}>{run.ok ? "Clean" : "Has errors"}</span>
        <span className="when">{formatWindow(run.started, run.finished)}</span>
        <span className="model">{run.model}</span>
      </div>
      <p className="metrics">
        <span className="metric">Scouted {run.scouted}</span>
        <span className="metric">Shortlisted {run.shortlisted}</span>
        <span className="metric">Skipped {run.skipped}</span>
        <span className="metric">Written {run.written}</span>
        <span className="metric">Write skip {run.writeSkipped}</span>
      </p>
      {run.errors.length > 0 ? (
        <ul className="errors">
          {run.errors.map((error, index) => (
            <li key={`${run.id}-err-${index}`}>{error}</li>
          ))}
        </ul>
      ) : null}
      {run.path ? <p className="path">{run.path}</p> : null}
    </article>
  );
}

/**
 * Purpose: Format a run's start–end window for the list.
 * Does not: localize logs beyond the raw ISO timestamps.
 */
export function formatWindow(started: string, finished: string): string {
  const start = formatClock(started);
  const end = formatClock(finished);
  if (start && end) return `${start}–${end}`;
  return start || end || "—";
}

function formatClock(value: string): string {
  if (!value) return "";
  const match = value.match(/T(\d{2}:\d{2})/);
  if (match) return match[1];
  return value.length > 16 ? value.slice(0, 16) : value;
}
