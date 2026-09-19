/** One start URL or clip the crawl policy refused before any request. */
export interface PolicyRefusal {
  id: string;
  /** The host/path that was refused — printed, never requested. */
  target: string;
  /** When and where it came from, e.g. "tonight 02:31 · start URL". */
  context: string;
}

interface PolicyRefusalsProps {
  refusals: PolicyRefusal[];
  /** How many days the window covers. */
  windowDays: number;
  /** Fetches actually attempted against a banned host. Always 0. */
  fetchesAttempted: number;
}

/**
 * Purpose: Make the crawl policy visible — every refusal, with the count of
 *          fetches actually attempted (zero, by construction).
 * Does not: retry a refused URL or offer a way to override the deny-list.
 */
export function PolicyRefusals({
  refusals,
  windowDays,
  fetchesAttempted,
}: PolicyRefusalsProps) {
  return (
    <section className="activity-card" aria-labelledby="refusals-title">
      <p className="activity-card__kicker activity-card__kicker--policy">Crawl policy</p>
      <h2 id="refusals-title" className="activity-card__title">
        Policy refusals
      </h2>

      {refusals.length === 0 ? (
        <p className="activity-card__empty">
          Nothing refused in the last {windowDays} days.
        </p>
      ) : (
        <ul className="refusal-list">
          {refusals.map((refusal) => (
            <li className="refusal-row" key={refusal.id}>
              <span className="refusal-row__dot" aria-hidden="true" />
              <span className="refusal-row__col">
                <span className="refusal-row__target">⊘ {refusal.target}</span>
                <span className="refusal-row__context">{refusal.context}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="activity-card__footnote">
        {refusals.length} refusal{refusals.length === 1 ? "" : "s"} in {windowDays} days ·{" "}
        {fetchesAttempted} fetches attempted
      </p>
    </section>
  );
}
