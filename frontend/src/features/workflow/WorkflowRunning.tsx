/**
 * Workflow while Scout/Match/Write is running. Write stays queued behind Match.
 */
export function WorkflowRunning() {
  return (
    <section className="panel state-panel" aria-labelledby="wf-running-title" aria-busy="true">
      <p className="panel-kicker">
        <span className="led led-run" /> Live
      </p>
      <h2 id="wf-running-title">Match in progress</h2>
      <p className="muted">Write is queued behind Match. No letters leave until scoring finishes.</p>
    </section>
  );
}
