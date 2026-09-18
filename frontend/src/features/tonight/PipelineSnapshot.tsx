import type { Run, StageStatus } from "./types";

const STAGES: { id: keyof Run["stages"]; label: string }[] = [
  { id: "scout", label: "Scout" },
  { id: "match", label: "Match" },
  { id: "write", label: "Write" },
];

function tone(status: StageStatus): string {
  if (status === "done") return "led-live";
  if (status === "running") return "led-run";
  if (status === "failed") return "led-fail";
  if (status === "queued") return "led-wait";
  return "led-idle";
}

/**
 * Compact Scout → Match → Write lights for last night's pipeline.
 */
export function PipelineSnapshot({ run }: { run: Run }) {
  return (
    <section className="panel pipeline-snapshot" aria-labelledby="pipe-title">
      <p className="panel-kicker">Pipeline</p>
      <h2 id="pipe-title">Snapshot</h2>
      <ol className="pipe-lights">
        {STAGES.map((stage) => (
          <li key={stage.id}>
            <span className={`led ${tone(run.stages[stage.id])}`} />
            <span className="pipe-name">{stage.label}</span>
            <span className="pipe-state">{run.stages[stage.id]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
