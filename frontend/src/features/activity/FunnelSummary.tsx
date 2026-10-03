import { Meter } from "../../shared/ui/Meter";
import type { FunnelView } from "./types";

type FunnelSummaryProps = {
  funnel: FunnelView;
  /** Days the funnel covers, printed in the kicker. */
  windowDays?: number;
};

/** The five funnel stages, from what scout found to what you sent. */
const STAGES = [
  { label: "Scouted", tone: "accent", allTime: false },
  { label: "Shortlisted", tone: "shortlist", allTime: false },
  { label: "Drafted", tone: "draft", allTime: false },
  { label: "Approved", tone: "approved", allTime: true },
  { label: "Applied", tone: "applied", allTime: true },
] as const;

/**
 * Purpose: Conversion funnel — how many listings survive each stage.
 *          Shows a dash for every stage when there is no data (loading, offline-empty, or no runs in the window).
 *          Approved/Applied are all-time vault counts (no dates in /jobs), so they get no rate.
 * Does not: start runs or list individual job packets.
 */
export function FunnelSummary({ funnel, windowDays = 30 }: FunnelSummaryProps) {
  const values: Record<string, number> = {
    Scouted: funnel.scouted,
    Shortlisted: funnel.shortlisted,
    Drafted: funnel.written,
    Approved: funnel.jobs.approved,
    Applied: funnel.jobs.applied,
  };
  const empty = Object.values(values).every((v) => !v);
  const top = values.Scouted || 0;

  return (
    <section className="activity-card" aria-labelledby="funnel-title">
      <p className="activity-card__kicker">Last {windowDays} days</p>
      <h2 id="funnel-title" className="activity-card__title">
        Conversion funnel
      </h2>

      {STAGES.map((stage) => {
        const value = values[stage.label] ?? 0;
        return (
          <div className="funnel-stage" key={stage.label}>
            <p className="funnel-stage__head">
              <span className="funnel-stage__label">{stage.label}{stage.allTime ? <span className="funnel-stage__scope"> · all time</span> : null}</span>
              <span className="funnel-stage__value">{empty ? <span role="img" aria-label="no data">—</span> : value.toLocaleString()}</span>
              <span className="funnel-stage__pct">{stage.allTime ? "—" : percent(value, top)}</span>
            </p>
            {stage.allTime ? null : <Meter value={top <= 0 ? 0 : value / top} tone={stage.tone} label={stage.label} />}
          </div>
        );
      })}
    </section>
  );
}

function percent(value: number, top: number): string {
  if (top <= 0) return "—";
  return `${((value / top) * 100).toFixed(1)}%`;
}
