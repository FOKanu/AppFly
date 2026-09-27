import { Chip } from "../../shared/ui/Chip";
import { id5 } from "../../shared/run/format";
import type { RunSummary } from "./types";

type RunRowProps = {
  run: RunSummary;
};

export type Outcome = { label: string; tone: "ok" | "warning" | "danger" | "accent" | "neutral" };

/**
 * Purpose: One redacted run-log row: id, window, counts, and outcome (spec C2 to C5).
 * Does not: display API keys, raw vault letters, or a filesystem path for run rows.
 */
export function RunRow({ run }: RunRowProps) {
  const outcome = outcomeOf(run);
  const isRun = run.kind === "run";

  return (
    <article className="run-row">
      <header className="run-row__head">
        <span className="run-row__id" title={isRun ? run.id : undefined}>
          {isRun ? `#${id5(run.id)}${triggerSuffix(run.trigger)}` : run.id}
        </span>
        <span className="run-row__window">{formatWindow(run.started, run.finished)}</span>
        <span className="run-row__rule" />
        <Chip tone={outcome.tone}>{outcome.label}</Chip>
      </header>

      <p className="run-row__metrics">{metricsLine(run)}</p>

      {run.errors.length > 0 ? (
        <ul className="run-row__errors">
          {run.errors.map((error, index) => (
            <li key={`${run.id}-err-${index}`}>{error}</li>
          ))}
        </ul>
      ) : isRun && run.errorCount > 0 ? (
        <p className="run-row__path">{`${run.errorCount} error(s)`}</p>
      ) : null}

      {!isRun && run.path ? <p className="run-row__path">{run.path}</p> : null}
    </article>
  );
}

/** Purpose: Add suffix to id for nightly or CLI runs. */
function triggerSuffix(trigger: string): string {
  if (trigger === "nightly") return " \u00b7 nightly run";
  if (trigger === "cli") return " \u00b7 CLI run";
  return "";
}

/** Purpose: Format the metrics line for a run row. */
function metricsLine(run: RunSummary): string {
  const DASH = "\u2014";
  const s = run.scouted ?? DASH;
  const m = run.shortlisted ?? DASH;
  const w = run.written ?? DASH;
  const ws = run.writeSkipped ?? DASH;

  let writePart = `${w}`;
  if (run.written !== null && run.writeSkipped !== null) {
    writePart += `/${run.written + run.writeSkipped}`;
  }
  if (run.writeSkipped !== null && run.writeSkipped > 0) {
    writePart += ` (${ws} fallback)`;
  }

  return `scout ${s} \u00b7 match ${m} \u00b7 write ${writePart}`;
}

/** Purpose: The outcome chip for a row; the Activity execution log reuses it so the two never drift. */
export function outcomeOf(run: RunSummary): Outcome {
  if (run.kind === "day_note") {
    // Day note logic
    if (!run.ok) return { label: "error", tone: "danger" };
    if ((run.writeSkipped ?? 0) > 0) return { label: "fallback", tone: "warning" };
    return { label: "ok", tone: "ok" };
  }

  // Run row logic
  if (run.interrupted) {
    return { label: "interrupted", tone: "neutral" };
  }
  if (run.status === "queued" || run.status === "running") {
    return { label: "running", tone: "accent" };
  }
  if (run.status === "completed") {
    if ((run.writeSkipped ?? 0) > 0) return { label: "fallback", tone: "warning" };
    return { label: "ok", tone: "ok" };
  }
  if (run.status === "completed_with_errors") {
    return { label: "finished with problems", tone: "warning" };
  }
  if (run.status === "failed") {
    if ((run.written ?? 0) > 0) return { label: "finished with problems", tone: "warning" };
    return { label: "failed", tone: "danger" };
  }
  if (run.status === "cancelled") {
    return { label: "stopped", tone: "neutral" };
  }
  return { label: run.status || "unknown", tone: "neutral" };
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
