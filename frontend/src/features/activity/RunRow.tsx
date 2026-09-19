import { Chip } from "../../shared/ui/Chip";
import type { RunSummary } from "./types";

type RunRowProps = {
  run: RunSummary;
};

/**
 * Purpose: One redacted run-log row — id, window, counts, and outcome.
 * Does not: display API keys or raw vault letters.
 */
export function RunRow({ run }: RunRowProps) {
  const outcome = outcomeOf(run);

  return (
    <article className="run-row">
      <header className="run-row__head">
        <span className="run-row__id">{run.id}</span>
        <span className="run-row__window">{formatWindow(run.started, run.finished)}</span>
        <span className="run-row__rule" />
        <Chip tone={outcome.tone}>{outcome.label}</Chip>
      </header>

      <p className="run-row__metrics">
        scout {run.scouted} · match {run.shortlisted} · write {run.written}/
        {run.written + run.writeSkipped}
        {run.writeSkipped > 0 ? ` (${run.writeSkipped} fallback)` : ""}
      </p>

      {run.errors.length > 0 ? (
        <ul className="run-row__errors">
          {run.errors.map((error, index) => (
            <li key={`${run.id}-err-${index}`}>{error}</li>
          ))}
        </ul>
      ) : null}

      {run.path ? <p className="run-row__path">{run.path}</p> : null}
    </article>
  );
}

/** Clean runs read "ok"; a write fallback is distinct from a failure. */
function outcomeOf(run: RunSummary): { label: string; tone: "ok" | "warning" | "danger" } {
  if (!run.ok) return { label: "error", tone: "danger" };
  if (run.writeSkipped > 0) return { label: "fallback", tone: "warning" };
  return { label: "ok", tone: "ok" };
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
