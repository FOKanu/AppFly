/**
 * Empty Workflow: no pipeline activity in the vault.
 */
export function WorkflowEmpty() {
  return (
    <section className="panel state-panel" aria-labelledby="wf-empty-title">
      <p className="panel-kicker">Idle</p>
      <h2 id="wf-empty-title">Pipeline is dark</h2>
      <p className="muted">
        Scout, Match, and Write have not started. The UI will not crawl LinkedIn, Indeed, or other
        denied boards to fill this panel.
      </p>
    </section>
  );
}
