/**
 * Tonight while a copilot run is in flight.
 */
export function TonightRunning() {
  return (
    <section className="panel state-panel" aria-labelledby="tonight-running-title" aria-busy="true">
      <p className="panel-kicker">
        <span className="led led-run" /> In flight
      </p>
      <h2 id="tonight-running-title">Run in progress</h2>
      <p className="muted">Scout is feeding Match. Write stays queued until scoring finishes.</p>
      <div className="skeleton-row" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
