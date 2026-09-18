import { RunFailedState } from "./states/RunFailedState";

/**
 * Failed Workflow state. Copy is the FigJam 05 empty canvas; nothing is submitted.
 */
export function WorkflowFailed() {
  return <RunFailedState />;
}
