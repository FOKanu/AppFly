import { Link } from "react-router-dom";
import { Score } from "../../shared/ui/Score";
import { StatusChip, type JobStatusName } from "../../shared/ui/StatusChip";
import { ROUTES } from "../../routes";
import type { LedgerEntry } from "./ledger";

interface ApplicationLedgerProps {
  entries: LedgerEntry[];
  /** True when some rows could not be hydrated for salary. */
  salaryTruncated: boolean;
}

/**
 * Purpose: Every job that reached approved or applied — what the copilot has
 *          actually put in front of a company.
 * Does not: duplicate Activity. Activity is run logs; this is career history.
 */
export function ApplicationLedger({ entries, salaryTruncated }: ApplicationLedgerProps) {
  return (
    <section className="ledger-card" id="applications" aria-labelledby="applications-title">
      <header className="ledger-card__head">
        <div>
          <p className="ledger-card__kicker">Application history</p>
          <h2 id="applications-title" className="ledger-card__title">
            What you have sent
          </h2>
        </div>
        <span className="ledger-card__count">
          {entries.length} application{entries.length === 1 ? "" : "s"}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="ledger-card__empty">
          Nothing approved or applied yet. Approve a packet in the Queue and it lands here.
        </p>
      ) : (
        <div className="ledger-table" role="table" aria-label="Application history">
          <div className="ledger-row ledger-row--head" role="row">
            <span role="columnheader">Company</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Salary</span>
            <span role="columnheader">Match</span>
          </div>
          {entries.map((entry) => (
            <Link
              className="ledger-row"
              role="row"
              key={entry.sourceId}
              to={`${ROUTES.packet}/${encodeURIComponent(entry.sourceId)}`}
            >
              <span role="cell" className="ledger-row__company">
                {entry.company}
              </span>
              <span role="cell" className="ledger-row__role">
                {entry.role}
                {entry.location ? (
                  <span className="ledger-row__sub">{entry.location}</span>
                ) : null}
              </span>
              <span role="cell">
                <StatusChip status={entry.status as JobStatusName} />
              </span>
              <span role="cell" className="ledger-row__salary">
                {entry.salary || "—"}
              </span>
              <span role="cell">
                <Score value={entry.score} size="sm" />
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="ledger-card__note">
        The vault stores no timestamp on a job note, so this ledger has no dates yet.
        {salaryTruncated
          ? " Salary was read for the most recent applications only."
          : ""}
      </p>
    </section>
  );
}
