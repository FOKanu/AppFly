import { Button } from "../../shared/ui/Button";
import { Switch } from "../../shared/ui/Switch";

/** The state machine the jobhunt CLI emits over IPC, in order. */
export const HEARTBEAT_STATES = [
  "asleep",
  "waking",
  "hunting",
  "matching",
  "writing",
  "waiting-for-you",
  "error",
] as const;

export type HeartbeatStateName = (typeof HEARTBEAT_STATES)[number];

interface HeartbeatPanelProps {
  state: HeartbeatStateName;
  /** e.g. "since 02:47 · run #0412 finished · 3 drafts need review". */
  detail: string;
  nightlyOn: boolean;
  onNightly: (next: boolean) => void;
  /** Why the nightly toggle cannot be flipped from here. */
  nightlyReason?: string;
  onRunNow: () => void;
  onStop: () => void;
  /** Why Stop is inert. */
  stopReason?: string;
  /** True while a run is in flight; Stop is dead otherwise. */
  running: boolean;
}

/**
 * Purpose: Top of the control plane — current heartbeat, run controls, and the
 *          full state machine laid out left to right.
 * Does not: emit heartbeats; the CLI does, and this only reflects them.
 */
export function HeartbeatPanel({
  state,
  detail,
  nightlyOn,
  onNightly,
  nightlyReason,
  onRunNow,
  onStop,
  stopReason,
  running,
}: HeartbeatPanelProps) {
  return (
    <section className="heartbeat-panel" aria-label="Heartbeat">
      <div className="heartbeat-panel__row">
        <div className="heartbeat-panel__col">
          <p className="heartbeat-panel__kicker">Heartbeat</p>
          <p className="heartbeat-panel__state">
            <span className="heartbeat-panel__now" data-state={state}>
              {state}
            </span>
            <span className="heartbeat-panel__detail">{detail}</span>
          </p>
        </div>

        <div className="heartbeat-panel__controls">
          <Button variant="primary" icon="▶" onClick={onRunNow} disabled={running}>
            Run now
          </Button>
          <span className="nightly-toggle" title={nightlyReason}>
            Nightly schedule
            <Switch
              checked={nightlyOn}
              onChange={onNightly}
              label="Nightly schedule"
              disabled={Boolean(nightlyReason)}
            />
          </span>
          <Button
            variant="danger"
            icon="■"
            onClick={onStop}
            disabled
            title={stopReason}
          >
            Stop current run
          </Button>
          <span className="heartbeat-panel__flight">
            {running ? "run in flight" : "nothing in flight"}
          </span>
        </div>
      </div>

      <div className="heartbeat-panel__machine">
        {HEARTBEAT_STATES.map((name, index) => (
          <span className="heartbeat-step" key={name}>
            <span
              className={name === state ? "state-pill is-active" : "state-pill"}
              data-state={name}
            >
              <span className="state-pill__dot" aria-hidden="true" />
              {name}
            </span>
            {index < HEARTBEAT_STATES.length - 1 ? (
              <span className="heartbeat-step__line" aria-hidden="true" />
            ) : null}
          </span>
        ))}
        <span className="heartbeat-panel__source">
          state machine · emitted by jobhunt CLI over IPC
        </span>
      </div>
    </section>
  );
}
