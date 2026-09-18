import { Panel } from "../../shared/ui/Panel";

/**
 * Purpose: Memory & profiles route placeholder inside the app shell.
 * Does not: edit CV slices, voice samples, or Requirements.md.
 */
export function MemoryPage() {
  return (
    <section className="page">
      <p className="page__index">04</p>
      <h2 className="page__title">Memory & profiles</h2>
      <Panel>
        <p className="page__lead">
          CV, voice samples, and requirements stay in the Obsidian vault.
        </p>
        <p className="page__copy">This screen will later point at vault slices — not a second CV editor.</p>
      </Panel>
    </section>
  );
}
