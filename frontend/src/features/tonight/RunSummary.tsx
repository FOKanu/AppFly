import type { DataSource, Run } from "./types";

function clock(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Last copilot run summary: window and scout / match / write counts.
 */
export function RunSummary({ run, source }: { run: Run; source: DataSource }) {
  const windowLabel = `${clock(run.started_at)}–${clock(run.finished_at)}`;
  return (
    <section className="panel run-summary" aria-labelledby="run-summary-title">
      <p className="panel-kicker">Last run</p>
      <h2 id="run-summary-title">Run summary</h2>
      <p className="run-window">
        {windowLabel}
        <span className="run-source">{source === "api" ? "vault" : "fixture"}</span>
      </p>
      <dl className="metric-row">
        <div>
          <dt>Scouted</dt>
          <dd>{run.scouted}</dd>
        </div>
        <div>
          <dt>Shortlisted</dt>
          <dd>{run.shortlisted}</dd>
        </div>
        <div>
          <dt>Written</dt>
          <dd>{run.written}</dd>
        </div>
        <div>
          <dt>Skipped</dt>
          <dd>{run.skipped}</dd>
        </div>
      </dl>
    </section>
  );
}
