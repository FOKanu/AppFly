import type { Stage } from "./types";

function lamp(status: Stage["status"]): string {
  if (status === "done") return "led-live";
  if (status === "running") return "led-run";
  if (status === "failed") return "led-fail";
  if (status === "rate_limited" || status === "queued") return "led-wait";
  return "led-idle";
}

/**
 * Scout → Match → Write stepper with connecting rails.
 */
export function PipelineStepper({ stages }: { stages: Stage[] }) {
  return (
    <ol className="stepper" aria-label="Scout to Write">
      {stages.map((stage, index) => (
        <li key={stage.id} className={`step step-${stage.status}`}>
          {index > 0 ? <span className="rail" aria-hidden="true" /> : null}
          <span className={`led ${lamp(stage.status)}`} />
          <span className="step-label">{stage.label}</span>
          <span className="step-status">{stage.status.replace("_", " ")}</span>
        </li>
      ))}
    </ol>
  );
}
