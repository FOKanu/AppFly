/**
 * Failed Workflow state. Copy is fixed: "Run failed, API down".
 */
export function WorkflowFailed() {
  return (
    <section className="panel state-panel state-fail" aria-labelledby="wf-failed-title">
      <p className="panel-kicker">
        <span className="led led-fail" /> Fault
      </p>
      <h2 id="wf-failed-title">Run failed, API down</h2>
      <p className="muted">
        Scout could not reach the local API. Retry Gemini is disabled until health returns — this
        page will not scrape around the outage.
      </p>
    </section>
  );
}
