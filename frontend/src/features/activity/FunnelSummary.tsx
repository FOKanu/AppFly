import { Meter } from "../../shared/ui/Meter";
import type { FunnelView } from "./types";

type FunnelSummaryProps = {
  funnel: FunnelView;
  /** Days the funnel covers, printed in the kicker. */
  windowDays?: number;
};

/** The five funnel stages, from what scout found to what you sent. */
const STAGES = [
  { label: "Scouted", tone: "accent" },
  { label: "Shortlisted", tone: "shortlist" },
  { label: "Drafted", tone: "draft" },
  { label: "Approved", tone: "approved" },
  { label: "Applied", tone: "applied" },
] as const;

/**
 * Purpose: Conversion funnel — how many listings survive each stage.
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
              <span className="funnel-stage__label">{stage.label}</span>
              <span className="funnel-stage__value">{value.toLocaleString()}</span>
              <span className="funnel-stage__pct">{percent(value, top)}</span>
            </p>
            <Meter value={top > 0 ? value / top : 0} tone={stage.tone} label={stage.label} />
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
