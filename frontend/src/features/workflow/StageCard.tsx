import type { Stage } from "./types";

/**
 * One pipeline stage card (Scout, Match, or Write).
 */
export function StageCard({ stage }: { stage: Stage }) {
  return (
    <article className={`panel stage-card stage-${stage.status}`} aria-labelledby={`stage-${stage.id}`}>
      <p className="panel-kicker">{stage.status.replace("_", " ")}</p>
      <h2 id={`stage-${stage.id}`}>{stage.label}</h2>
      <p className="stage-count">{stage.count}</p>
      <p className="muted">{stage.detail}</p>
    </article>
  );
}
