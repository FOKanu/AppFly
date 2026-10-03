import { Meter } from "../../shared/ui/Meter";
import { Tag } from "../../shared/ui/Tag";
import { writerLabel } from "../../shared/writerLabel";
import { BANNED_BRANDS } from "../../shared/policy";
import type { Run } from "./types";

/** Cumulative funnel counts the Activity screen also reports. */
export interface FunnelTotals {
  scouted?: number;
  shortlisted?: number;
  approved?: number;
  applied?: number;
}

/** Writer token usage for the run (Gemini is the only writer). */
export interface WriterUsage {
  mode?: string;
  cloudLabel?: string;
  cloudTokens?: number;
}

interface LastRunSummaryProps {
  run: Run | null;
  funnel: FunnelTotals;
  writer: WriterUsage;
  /** Real crawl-policy refusals reported by the run; null when unknown (D6). */
  refusals: string[] | null;
}

/**
 * Purpose: Right rail on Tonight — last run's funnel, writer token split, and the
 *          crawl-policy card.
 * Does not: enforce policy; policy.py refuses before any request is made.
 */
export function LastRunSummary({ run, funnel, writer, refusals }: LastRunSummaryProps) {
  const top = funnel.scouted ?? 0;

  return (
    <aside className="run-summary" aria-label="Last run summary">
      <h2 className="run-summary__title">Last run summary</h2>

      <section className="run-summary__card">
        <p className="run-summary__label">Funnel · last run</p>
        <FunnelRow label="Scouted" value={funnel.scouted} of={top} tone="accent" />
        <FunnelRow
          label="Shortlisted"
          value={funnel.shortlisted}
          of={top}
          tone="shortlist"
        />
        <FunnelRow label="Approved" value={funnel.approved} of={top} tone="approved" />
        <FunnelRow label="Applied" value={funnel.applied} of={top} tone="applied" />
      </section>

      <section className="run-summary__card">
        <div className="run-summary__row">
          <span className="t-title-sm">Writer</span>
          <Tag>mode: {writer.mode ?? "—"}</Tag>
          <span className="run-summary__rule" />
          <span className="run-summary__value">{formatTokens(totalTokens(writer))}</span>
        </div>
        <p className="run-summary__legend">
          <span>
            {run === null
              ? "No runs yet"
              : `${writerLabel(writer.cloudLabel)} · ${formatTokens(writer.cloudTokens)}`}
          </span>
        </p>
      </section>

      <section className="run-summary__card run-summary__card--policy">
        <div className="run-summary__row">
          <span className="policy-dot" aria-hidden="true" />
          <span className="t-title-sm policy-title">Crawl policy enforced</span>
          <span className="run-summary__rule" />
          <span className="run-summary__value policy-count">
            {refusals === null
              ? "\u2014 refusals"
              : `${refusals.length} refusal${refusals.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <p className="run-summary__policy-copy">
          Blocked before any request: {BANNED_BRANDS.join(" \u00b7 ")}.
          {refusals === null
            ? ""
            : refusals.length > 0
              ? ` Refused: ${refusals.join(", ")}.`
              : " Nothing refused this run."}
        </p>
      </section>
    </aside>
  );
}

function FunnelRow({
  label,
  value,
  of,
  tone,
}: {
  label: string;
  value: number | undefined;
  of: number;
  tone: "accent" | "shortlist" | "approved" | "applied";
}) {
  return (
    <div className="funnel-row">
      <span className="funnel-row__label">{label}</span>
      {value !== undefined && of > 0 ? (
        <Meter value={value / of} tone={tone} label={label} />
      ) : (
        <span className="funnel-row__track" aria-hidden="true" />
      )}
      <span className="funnel-row__value">
        {value === undefined ? "—" : value.toLocaleString()}
      </span>
    </div>
  );
}

function totalTokens(writer: WriterUsage): number | undefined {
  return writer.cloudTokens;
}

function formatTokens(value: number | undefined): string {
  return value === undefined ? "—" : `${value.toLocaleString()} tok`;
}
