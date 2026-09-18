import type { FunnelView } from "./types";

const PIPELINE: { key: keyof Omit<FunnelView, "jobs">; label: string }[] = [
  { key: "scouted", label: "Scouted" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "skipped", label: "Matcher skip" },
  { key: "written", label: "Letters" },
  { key: "writeSkipped", label: "Write skip" },
];

const VAULT: { key: keyof FunnelView["jobs"]; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "shortlist", label: "Shortlist" },
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "applied", label: "Applied" },
  { key: "skipped", label: "Skipped" },
];

type FunnelSummaryProps = {
  funnel: FunnelView;
};

/**
 * Purpose: Show pipeline totals and vault job-status funnel.
 * Does not: start runs or list individual job packets.
 */
export function FunnelSummary({ funnel }: FunnelSummaryProps) {
  return (
    <div className="funnel">
      <section className="funnel-row" aria-label="Pipeline funnel">
        <h2>Pipeline (all loaded runs)</h2>
        <dl className="steps">
          {PIPELINE.map((step) => (
            <div className="step" key={step.key}>
              <dt>{step.label}</dt>
              <dd>{funnel[step.key]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="funnel-row" aria-label="Vault funnel">
        <h2>Vault jobs by status</h2>
        <dl className="steps">
          {VAULT.map((step) => (
            <div className="step" key={step.key}>
              <dt>{step.label}</dt>
              <dd>{funnel.jobs[step.key]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
