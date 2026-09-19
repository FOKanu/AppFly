import type { HeartbeatState } from "../../shared/api/client";

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
  telemetry: RunTelemetry;
  ipcConnected: boolean;
}

/**
 * Purpose: Persistent 32px mono strip across the bottom of every desktop screen.
 * Does not: stream scout/match/write logs or mutate the vault.
 */
export function RunningBar({ state, telemetry, ipcConnected }: RunningBarProps) {
  return (
    <div className="running-bar" role="status" aria-live="polite">
      <span className="running-bar__state" data-state={state}>
        <span className="running-bar__led" aria-hidden="true" />
        {state}
      </span>

      <span className="running-bar__field">
        run {telemetry.runId ?? "—"}
        {telemetry.window ? ` · ${telemetry.window}` : ""}
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

      <span className="running-bar__spacer" />

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
