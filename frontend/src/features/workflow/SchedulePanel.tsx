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
  onChange: (next: NightlyPlan) => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/**
 * Purpose: When the nightly run fires and the hard caps it must respect.
 * Does not: start a run; the heartbeat panel and control header do that.
 */
export function SchedulePanel({ plan, onChange }: SchedulePanelProps) {
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
          onChange={(event) => onChange({ ...plan, start: event.target.value })}
        />
        <span className="field-row__suffix">{plan.timezone}</span>
      </div>

      <div className="field-row">
        <span className="field-row__label">Days</span>
        <div className="day-picker" role="group" aria-label="Nights the run fires">
          {DAY_LABELS.map((label, index) => (
            <button
              key={`${label}-${index}`}
              type="button"
              className={plan.days[index] ? "day-cell is-on" : "day-cell"}
              aria-pressed={plan.days[index]}
              aria-label={`Day ${index + 1}`}
              onClick={() =>
                onChange({
                  ...plan,
                  days: plan.days.map((on, i) => (i === index ? !on : on)),
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Stepper
        label="Letters / night"
        value={plan.lettersPerNight}
        suffix="hard cap"
        step={1}
        min={0}
        onChange={(lettersPerNight) => onChange({ ...plan, lettersPerNight })}
      />
      <Stepper
        label="Max listings scouted"
        value={plan.maxListings}
        suffix="per run"
        step={10}
        min={0}
        onChange={(maxListings) => onChange({ ...plan, maxListings })}
      />
      <Stepper
        label="Shortlist threshold"
        value={plan.shortlistThreshold}
        suffix="score ≥"
        step={0.5}
        min={0}
        max={10}
        decimals={1}
        onChange={(shortlistThreshold) => onChange({ ...plan, shortlistThreshold })}
      />
    </section>
  );
}

function Stepper({
  label,
  value,
  suffix,
  step,
  min,
  max,
  decimals = 0,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  step: number;
  min: number;
  max?: number;
  decimals?: number;
  onChange: (next: number) => void;
}) {
  const clamp = (next: number) =>
    Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, Number(next.toFixed(decimals))));

  return (
    <div className="field-row">
      <span className="field-row__label">{label}</span>
      <span className="stepper">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <span className="stepper__value">{value.toFixed(decimals)}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </span>
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
  onMode: (next: WriterMode) => void;
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
  onMode,
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
        onChange={onMode}
        ariaLabel="Writer model"
        className="writer-modes"
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
