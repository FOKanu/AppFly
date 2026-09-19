import { Score } from "../../shared/ui/Score";
import type { CompanyEntry } from "./ledger";

interface CompaniesLedgerProps {
  companies: CompanyEntry[];
}

/**
 * Purpose: One row per company you have already approached, so you do not
 *          apply twice by accident.
 * Does not: fetch anything about the company — this is a rollup of vault notes.
 */
export function CompaniesLedger({ companies }: CompaniesLedgerProps) {
  return (
    <section className="ledger-card" id="companies" aria-labelledby="companies-title">
      <header className="ledger-card__head">
        <div>
          <p className="ledger-card__kicker">Companies &amp; roles</p>
          <h2 id="companies-title" className="ledger-card__title">
            Already hit
          </h2>
        </div>
        <span className="ledger-card__count">
          {companies.length} compan{companies.length === 1 ? "y" : "ies"}
        </span>
      </header>

      {companies.length === 0 ? (
        <p className="ledger-card__empty">
          No company has reached approved or applied yet.
        </p>
      ) : (
        <ul className="company-list">
          {companies.map((row) => (
            <li className="company-row" key={row.company}>
              <span className="company-row__col">
                <span className="company-row__name">{row.company}</span>
                <span className="company-row__roles">{row.roles.join(" · ")}</span>
              </span>

              <span className="company-row__counts">
                {row.applied > 0 ? (
                  <span className="company-tally" data-tone="applied">
                    {row.applied} applied
                  </span>
                ) : null}
                {row.approved > 0 ? (
                  <span className="company-tally" data-tone="approved">
                    {row.approved} approved
                  </span>
                ) : null}
              </span>

              <span className="company-row__salary">{row.salaries[0] || "—"}</span>
              <Score value={row.bestScore} size="sm" />
            </li>
          ))}
        </ul>
      )}

      <p className="ledger-card__note">
        Companies you skip are recorded on the job note itself. Salary shows what the posting
        listed, where the vault captured it.
      </p>
    </section>
  );
}
