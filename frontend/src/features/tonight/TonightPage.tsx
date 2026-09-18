import { Panel } from "../../shared/ui/Panel";

/**
 * Purpose: Tonight route placeholder inside the app shell.
 * Does not: load Home.md, drafts, or waiting-for-you job lists.
 */
export function TonightPage() {
  return (
    <section className="page">
      <p className="page__index">01</p>
      <h2 className="page__title">Tonight</h2>
      <Panel>
        <p className="page__lead">
          Morning briefing lands here in a later slice. This shell only holds the route.
        </p>
        <p className="page__copy">
          Approve letters in the vault, then submit applications yourself. The copilot does
          not Easy Apply.
        </p>
      </Panel>
    </section>
  );
}
