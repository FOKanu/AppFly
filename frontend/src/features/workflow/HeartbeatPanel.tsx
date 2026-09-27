import { Button } from "../../shared/ui/Button";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

/** Heartbeat steps shown on the Workflow page, in order. */
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

/** Same sentence as the header's Pause nightly title (G5, H4). */
const NIGHTLY_TITLE = "The nightly schedule runs from launchd; pausing it from the app isn't supported yet.";

interface HeartbeatPanelProps {
  /** The lit step in the row; null lights none, H1 */
  activeStep: HeartbeatStateName | null;
  /** The big state word, e.g. "running", "lost contact", H1 */
  label: string;
  /** Colour of the big word: the active step, "hunting" for an unlit active run, "error" for lost contact */
  dataState: HeartbeatStateName;
  /** H2 detail line */
  detail: string;
  /** Append the "Watch in Activity" link, H2 */
  detailLink: boolean;
  /** A run is active; drives the flight text, H3 */
  inFlight: boolean;
  /** Run now handler */
  onRunNow: () => void;
  /** Run disabled state */
  runDisabled: boolean;
  /** Run title */
  runTitle: string;
  /** Stop handler */
  onStop: () => void;
  /** Stop disabled state */
  stopDisabled: boolean;
  /** Stop title */
  stopTitle: string;
  /** True while cancelling: the Stop label becomes "Stopping...", H3 */
  stopping: boolean;
}

/**
 * Purpose: Top of the control plane — current heartbeat, run controls, and the
 *          full state machine laid out left to right.
 * Does not: poll or start runs; WorkflowPage passes the shared run controller's state (useRun).
 */
export function HeartbeatPanel({
  activeStep,
  label,
  dataState,
  detail,
  detailLink,
  inFlight,
  onRunNow,
  runDisabled,
  runTitle,
  onStop,
  stopDisabled,
  stopTitle,
  stopping,
}: HeartbeatPanelProps) {
  return (
    <section className="heartbeat-panel" aria-label="Heartbeat">
      <div className="heartbeat-panel__row">
        <div className="heartbeat-panel__col">
          <p className="heartbeat-panel__kicker">Heartbeat</p>
          <p className="heartbeat-panel__state">
            <span className="heartbeat-panel__now" data-state={dataState}>
              {label}
            </span>
            <span className="heartbeat-panel__detail">
              {detail}
              {detailLink ? (
                <>
                  {" \u00b7 "}
                  <Link to={ROUTES.activity}>{"Watch in Activity \u2192"}</Link>
                </>
              ) : null}
            </span>
          </p>
        </div>

        <div className="heartbeat-panel__controls">
          <Button variant="primary" icon={"\u25b6"} onClick={onRunNow} disabled={runDisabled} title={runTitle || undefined}>
            Run now
          </Button>
          <span className="nightly-toggle" title={NIGHTLY_TITLE}>{"Nightly schedule \u00b7 set in launchd"}</span>
          <Button
            variant="danger"
            icon={"\u25a0"}
            onClick={onStop}
            disabled={stopDisabled}
            title={stopTitle || undefined}
          >
            {stopping ? "Stopping\u2026" : "Stop current run"}
          </Button>
          <span className="heartbeat-panel__flight">
            {inFlight ? "run in flight" : "nothing in flight"}
          </span>
        </div>
      </div>

      <div className="heartbeat-panel__machine">
        {HEARTBEAT_STATES.map((name, index) => (
          <span className="heartbeat-step" key={name}>
            <span
              className={name === activeStep ? "state-pill is-active" : "state-pill"}
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
          {"state \u00b7 from the local API run status"}
        </span>
      </div>
    </section>
  );
}
