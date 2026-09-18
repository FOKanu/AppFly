/**
 * Empty Tonight: no copilot run in the vault yet.
 */
export function TonightEmpty() {
  return (
    <section className="panel state-panel" aria-labelledby="tonight-empty-title">
      <p className="panel-kicker">Idle</p>
      <h2 id="tonight-empty-title">No run tonight</h2>
      <p className="muted">
        Scout, Match, and Write are dark. Drop clips in <code>_inbox/</code> or wait for the
        nightly run — this panel does not crawl job boards.
      </p>
    </section>
  );
}
