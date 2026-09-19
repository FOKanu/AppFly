import { Segmented } from "../../shared/ui/Segmented";

/** Nightly schedule and the caps that bound one run. */
export interface NightlyPlan {
  /** 24h local start time, e.g. "02:00". */
  start: string;
  timezone: string;
  /** Index 0 = Monday. */
  days: boolean[];
  lettersPerNight: number;
  maxListings: number;
  shortlistThreshold: number;
}

interface SchedulePanelProps {
  plan: NightlyPlan;
  /** Why nothing here is editable. Shown as a note and on each control. */
  readOnlyReason: string;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/**
 * Purpose: When the nightly run fires and the hard caps it must respect.
 * Does not: start a run; the heartbeat panel and control header do that.
 */
export function SchedulePanel({ plan, readOnlyReason }: SchedulePanelProps) {
  return (
    <section className="control-card" aria-labelledby="schedule-title">
      <p className="control-card__kicker">Nightly</p>
      <h2 id="schedule-title" className="control-card__title">
        Schedule &amp; caps
      </h2>

      <div className="field-row">
        <label className="field-row__label" htmlFor="nightly-start">
          Start
        </label>
        <input
          id="nightly-start"
          className="field-row__input field-row__input--time"
          type="time"
          value={plan.start}
          readOnly
          disabled
          title={readOnlyReason}
        />
        <span className="field-row__suffix">{plan.timezone}</span>
      </div>

      <div className="field-row">
        <span className="field-row__label">Days</span>
        <div className="day-picker" role="group" aria-label="Nights the run fires">
          {DAY_LABELS.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className={plan.days[index] ? "day-cell is-on" : "day-cell"}
              aria-label={`Day ${index + 1}: ${plan.days[index] ? "on" : "off"}`}
              title={readOnlyReason}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <Readout label="Letters / night" value={plan.lettersPerNight.toFixed(0)} suffix="hard cap" />
      <Readout label="Max listings scouted" value={plan.maxListings.toFixed(0)} suffix="per run" />
      <Readout
        label="Shortlist threshold"
        value={plan.shortlistThreshold.toFixed(1)}
        suffix="score ≥"
      />

      <p className="control-card__note">{readOnlyReason}</p>
    </section>
  );
}

/** A value from config.yaml the UI can show but not change. */
function Readout({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="field-row">
      <span className="field-row__label">{label}</span>
      <span className="readout">{value}</span>
      <span className="field-row__suffix">{suffix}</span>
    </div>
  );
}

/** Which writer backend the nightly run uses. */
export type WriterMode = "auto" | "cloud" | "local";

const WRITER_MODES = [
  { value: "auto", label: "Auto · Gemini → 8B" },
  { value: "cloud", label: "Gemini only" },
  { value: "local", label: "Local only" },
] as const;

interface WriterPanelProps {
  mode: WriterMode;
  /** Why the mode cannot be changed from here. */
  readOnlyReason: string;
  /** Tokens used per night for the last 7 nights, oldest first. */
  tokenHistory: number[];
  cloudLabel: string;
  cloudTokens?: number;
  localLabel: string;
  localTokens?: number;
  /** Last fallback event, e.g. "02:14 Gemini 429 rate-limit → local 8B". */
  fallbackNote?: string;
}

/**
 * Purpose: Writer model switcher with the backends the last run actually used
 *          and the 7-night token trend.
 * Does not: call a model; the CLI writer does.
 */
export function WriterPanel({
  mode,
  readOnlyReason,
  tokenHistory,
  cloudLabel,
  cloudTokens,
  localLabel,
  localTokens,
  fallbackNote,
}: WriterPanelProps) {
  const peak = Math.max(1, ...tokenHistory);
  const tonight = tokenHistory.at(-1);

  return (
    <section className="control-card" aria-labelledby="writer-title">
      <p className="control-card__kicker">Write</p>
      <h2 id="writer-title" className="control-card__title">
        Writer model
      </h2>

      <Segmented
        options={WRITER_MODES}
        value={mode}
        onChange={() => undefined}
        ariaLabel="Writer model"
        className="writer-modes"
        disabled
        disabledReason={readOnlyReason}
      />

      <div className="backend-box">
        <p className="control-card__label">Last backend used</p>
        <p className="backend-row">
          <span className="backend-row__dot" data-tone="cloud" aria-hidden="true" />
          {cloudLabel}
          <span className="backend-row__rule" />
          <span className="backend-row__value">{tokens(cloudTokens)}</span>
        </p>
        <p className="backend-row">
          <span className="backend-row__dot" data-tone="local" aria-hidden="true" />
          {localLabel}
          <span className="backend-row__rule" />
          <span className="backend-row__value">{tokens(localTokens)}</span>
        </p>
        <p className="backend-box__note">{fallbackNote ?? "No fallback events recorded."}</p>
      </div>

      <p className="control-card__label">Tokens · last 7 nights</p>
      <div className="token-chart" role="img" aria-label="Writer tokens over the last 7 nights">
        {(tokenHistory.length > 0 ? tokenHistory : Array(7).fill(0)).map((value, index) => (
          <span
            key={index}
            className={index === tokenHistory.length - 1 ? "token-bar is-latest" : "token-bar"}
            style={{ height: `${Math.max(6, (value / peak) * 100)}%` }}
          />
        ))}
      </div>
      <p className="token-chart__legend">
        <span>Tonight</span>
        <span className="token-chart__value">{tokens(tonight)}</span>
      </p>
    </section>
  );
}

function tokens(value: number | undefined): string {
  return value === undefined ? "—" : `${value.toLocaleString()} tok`;
}
