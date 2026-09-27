import type { HeartbeatState } from "../../shared/api/client";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";

/** Mono telemetry the running bar prints between the state and the right edge. */
export interface RunTelemetry {
  /** e.g. "#0412". */
  runId?: string;
  /** e.g. "02:29→02:47 · 18m06s". */
  window?: string;
  scouted?: number;
  matched?: number;
  written?: number;
  writeCap?: number;
  /** e.g. "gemini-flash ×3 · llama3.1:8b ×2". */
  writer?: string;
  tokens?: number;
  /** e.g. "02:00". */
  nextNightly?: string;
}

interface RunningBarProps {
  state: HeartbeatState;
  /** Visible run line (spec sections 4 to 6); may tick every second. */
  message: string;
  /** The same line without the elapsed time; the only text announced to screen readers (G1a). */
  liveMessage: string;
  telemetry: RunTelemetry;
  /** After 60 s of an active run the run field links to Activity (section 5). */
  runLink: boolean;
  ipcConnected: boolean;
}

/**
 * Purpose: Persistent 32px mono strip across the bottom of every desktop screen.
 * Does not: stream scout/match/write logs or mutate the vault.
 * The message field carries the run line; only liveMessage is announced (G1a).
 */
export function RunningBar({ state, message, liveMessage, telemetry, runLink, ipcConnected }: RunningBarProps) {
  return (
    <div className="running-bar">
      <span className="running-bar__state" data-state={state}>
        <span className="running-bar__led" aria-hidden="true" />
        {state}
      </span>

      <span className="running-bar__message" title={message}>
        {message}
      </span>
      <span className="running-bar__sr" role="status" aria-live="polite">
        {liveMessage}
      </span>

      <span className="running-bar__field">
        {runLink && telemetry.runId ? (
          <Link to={ROUTES.activity}>run {telemetry.runId}</Link>
        ) : (
          <>run {telemetry.runId ?? "\u2014"}</>
        )}
        {telemetry.window ? ` \u00b7 ${telemetry.window}` : ""}
      </span>
      <span className="running-bar__field">
        scout <b>{format(telemetry.scouted)}</b>
      </span>
      <span className="running-bar__field">
        match <b>{format(telemetry.matched)}</b>
      </span>
      <span className="running-bar__field">
        write <b>{formatRatio(telemetry.written, telemetry.writeCap)}</b>
      </span>
      <span className="running-bar__field">writer {telemetry.writer ?? "—"}</span>
      <span className="running-bar__field">
        tok <b>{telemetry.tokens ? telemetry.tokens.toLocaleString() : "—"}</b>
      </span>

      <span className="running-bar__field">next nightly {telemetry.nextNightly ?? "—"}</span>
      <span className="running-bar__link">
        Local IPC
        <span className="running-bar__led" aria-hidden="true" />
        {ipcConnected ? "connected" : "offline"}
      </span>
    </div>
  );
}

function format(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

function formatRatio(value: number | undefined, cap: number | undefined): string {
  if (value === undefined) return "—";
  return cap === undefined ? String(value) : `${value}/${cap}`;
}
