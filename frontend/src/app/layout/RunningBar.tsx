import type { HeartbeatState } from "../../shared/api/client";

interface RunningBarProps {
  state: HeartbeatState;
  message?: string;
}

const STEPS = ["Scout", "Match", "Write"] as const;

/**
 * Purpose: Persistent bottom running-bar for the current pipeline pulse.
 * Does not: stream scout/match/write logs or mutate the vault.
 */
export function RunningBar({ state, message }: RunningBarProps) {
  const activeIndex = stepIndex(state);
  const label = message ?? defaultMessage(state);

  return (
    <div className="running-bar" role="status" aria-live="polite">
      <span className="running-bar__led" data-state={state} aria-hidden="true" />
      <p className="running-bar__label">{label}</p>
      <ol className="running-bar__steps">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className={
              index <= activeIndex ? "running-bar__step is-on" : "running-bar__step"
            }
          >
            {step}
          </li>
        ))}
      </ol>
      <p className="running-bar__hint">Approve in the vault. You submit in the browser.</p>
    </div>
  );
}

function stepIndex(state: HeartbeatState): number {
  switch (state) {
    case "running":
      return 1;
    case "waiting-for-you":
      return 2;
    case "paused":
      return 0;
    default:
      return -1;
  }
}

function defaultMessage(state: HeartbeatState): string {
  switch (state) {
    case "running":
      return "Running nightly pipeline";
    case "waiting-for-you":
      return "Waiting for you — review drafts in the vault";
    case "paused":
      return "Nightly paused";
    case "stopped":
      return "Run stopped";
    default:
      return "Idle — no run in progress";
  }
}
