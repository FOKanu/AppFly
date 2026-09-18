import { Panel } from "../../shared/ui/Panel";

/**
 * Purpose: Queue route placeholder inside the app shell.
 * Does not: render job tables, filters, or source ingest.
 */
export function QueuePage() {
  return (
    <section className="page">
      <p className="page__index">02</p>
      <h2 className="page__title">Queue</h2>
      <Panel>
        <p className="page__lead">
          Queue table arrives in a later slice. The sidebar chip is a count only.
        </p>
        <p className="page__copy">
          Allowed ingest remains Arbeitsagentur API, RSS, Inbox clips, and public
          Impressum pages — never LinkedIn / Indeed / Stepstone scrapes.
        </p>
      </Panel>
    </section>
  );
}
