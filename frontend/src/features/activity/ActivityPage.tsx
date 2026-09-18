import { Panel } from "../../shared/ui/Panel";

/**
 * Purpose: Activity & logs route placeholder inside the app shell.
 * Does not: tail Runs/ notes or stream worker output.
 */
export function ActivityPage() {
  return (
    <section className="page">
      <p className="page__index">05</p>
      <h2 className="page__title">Activity & logs</h2>
      <Panel>
        <p className="page__lead">Run history will surface here. The running-bar is the live pulse.</p>
        <p className="page__copy">No crawl traces for deny-listed hosts — those runs must fail closed.</p>
      </Panel>
    </section>
  );
}
