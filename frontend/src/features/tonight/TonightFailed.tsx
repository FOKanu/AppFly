import type { Run } from "./types";

/**
 * Failed Tonight state. Copy is fixed: "Run failed, API down".
 */
export function TonightFailed({ run }: { run?: Run | null }) {
  return (
    <section className="panel state-panel state-fail" aria-labelledby="tonight-failed-title">
      <p className="panel-kicker">
        <span className="led led-fail" /> Fault
      </p>
      <h2 id="tonight-failed-title">Run failed, API down</h2>
      <p className="muted">
        The copilot did not scrape around the outage. Retry from Workflow when health is back.
        {run?.errors?.length ? ` Last error: ${run.errors[0]}` : ""}
      </p>
    </section>
  );
}
