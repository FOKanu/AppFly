import { Panel } from "../../shared/ui/Panel";
import { SourceBadge, SOURCE_BADGE_KINDS } from "../../shared/ui/SourceBadge";

/**
 * Purpose: Workflow route placeholder; shows allowed source badges only.
 * Does not: run scout/match/write or start Apify actors.
 */
export function WorkflowPage() {
  return (
    <section className="page">
      <p className="page__index">03</p>
      <h2 className="page__title">Workflow</h2>
      <Panel>
        <p className="page__lead">Scout → Match → Write. Pipeline controls live in the header.</p>
        <p className="page__copy">Allowed sources (badges for later list rows):</p>
        <div className="page__badges">
          {SOURCE_BADGE_KINDS.map((kind) => (
            <SourceBadge key={kind.id} kind={kind.id} />
          ))}
        </div>
      </Panel>
    </section>
  );
}
