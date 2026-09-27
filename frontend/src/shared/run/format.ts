import type { HeartbeatState } from "../api/client";
import { redactSecrets } from "../../features/activity/redact";
import type { RunCounts, RunStatus, RunUiState } from "./types";
import { knownCounts } from "./progress";

/** Purpose: UI states in which a run is in flight (Run now disabled, elapsed ticking). */
export const ACTIVE_UI: ReadonlySet<RunUiState> = new Set([
  "starting",
  "queued",
  "running",
  "cancelling",
  "lost-contact",
]);

/** Purpose: Last 5 characters of a run id, as shown in "#{id5}". */
export function id5(id: string): string {
  return id.slice(-5);
}

/** Purpose: Elapsed time like 45s, 3m12s or 1h04m (spec section 4). */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 60) {
    return `${total}s`;
  }
  const m = Math.floor(total / 60);
  const ss = total % 60;
  if (total < 3600) {
    return `${m}m${ss.toString().padStart(2, "0")}s`;
  }
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h${mm.toString().padStart(2, "0")}m`;
}

/** Purpose: "Run", "Nightly run" or "CLI run" from the B4 trigger. */
export function whoLabel(trigger: string | undefined): string {
  if (trigger === "nightly") return "Nightly run";
  if (trigger === "cli") return "CLI run";
  return "Run";
}

/** Purpose: B3 flag only; the "interrupted:" error-prefix fallback is gone (post-B1 pass, section 4). */
export function isInterrupted(status: RunStatus): boolean {
  return status.interrupted === true;
}

/** Purpose: Map a polled run status to its UI state (section 4 table; with B2, failed means a crash). */
export function uiFromStatus(status: RunStatus): RunUiState {
  switch (status.status) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "cancelled":
      return "cancelled";
    case "completed":
      return (status.written ?? 0) > 0 ? "completed" : "completed-empty";
    case "completed_with_errors":
      return "problems";
    case "failed":
      if (isInterrupted(status)) return "interrupted";
      return "failed";
    default:
      return "running";
  }
}

/** Purpose: LED (HeartbeatState) for each UI state (section 4 table). */
export function ledFor(ui: RunUiState): HeartbeatState {
  switch (ui) {
    case "idle":
    case "completed-empty":
      return "idle";
    case "starting":
    case "queued":
    case "running":
    case "cancelling":
      return "running";
    case "completed":
    case "problems":
      return "waiting-for-you";
    case "cancelled":
    case "failed":
    case "interrupted":
    case "lost-contact":
      return "stopped";
  }
}

/** Purpose: RunningBar counts; a count knownCounts() can't vouch for is undefined (a dash), never 0. */
export function countsFor(status: RunStatus | null): RunCounts {
  if (status === null) return {};
  const known = knownCounts(status);
  return {
    scouted: known.scouted ? status.scouted : undefined,
    matched: known.shortlisted ? status.shortlisted : undefined,
    written: known.written ? status.written : undefined,
    writeCap: status.write_cap ?? undefined,
  };
}

/** Inputs for runMessage. */
export interface RunMessageInput {
  ui: RunUiState;
  runId: string | null;
  status: RunStatus | null;
  elapsedMs: number;
  cancellingMs: number;
  finishedBeforeStop: boolean;
}

/** Purpose: Visible run line and its live-region twin without elapsed time (sections 4 to 6, G1a). */
export function runMessage(input: RunMessageInput): { text: string; live: string } {
  const id = input.runId ? id5(input.runId) : "";
  const s = input.status;
  const who = whoLabel(s?.trigger);
  const sc = s?.scouted ?? 0;
  const m = s?.shortlisted ?? 0;
  const w = s?.written ?? 0;
  const e = (s?.errors ?? []).length;
  const dot = " \u00b7 ";

  let base: string;
  let text: string;
  let live: string;

  switch (input.ui) {
    case "idle":
      base = "Idle \u00b7 no run in progress";
      text = base;
      live = base;
      break;
    case "starting":
      base = "Starting run\u2026";
      text = base;
      live = base;
      break;
    case "queued":
      base = `${who} #${id} queued\u2026`;
      text = base;
      live = base;
      break;
    case "running":
      base = `${who} #${id} running`;
      const stage = stageLabel(s);
      text = base + (stage ? dot + stage : "") + dot + formatElapsed(input.elapsedMs);
      if (input.elapsedMs >= 60000 && (!s?.stage || s.stage === "write")) {
        text += " \u00b7 long runs are normal while letters are written";
      }
      live = base;
      break;
    case "cancelling":
      base = `Stopping run #${id}\u2026 finishing the current ${s?.stage === "write" ? "letter" : "step"}`;
      text = base;
      if (input.cancellingMs > 30000 && s?.stage === "write") {
        text += " \u00b7 the writer is still answering";
      }
      live = base;
      break;
    case "cancelled":
      base = `Run #${id} stopped. Scouted ${sc}, shortlisted ${m}, wrote ${w} before stopping.`;
      text = base;
      live = base;
      break;
    case "completed":
      base = `Run #${id} done. ${w} draft(s) to review in Queue.`;
      if (input.finishedBeforeStop) {
        base += " It finished before it could stop.";
      }
      text = base;
      live = base;
      break;
    case "completed-empty":
      base = `Run #${id} done. Scouted ${sc}, shortlisted ${m}; no new drafts.`;
      if (input.finishedBeforeStop) {
        base += " It finished before it could stop.";
      }
      text = base;
      live = base;
      break;
    case "problems":
      base = `Run #${id} finished with problems: ${w} draft(s) written, ${e} error(s). See Activity.`;
      text = base;
      live = base;
      break;
    case "failed":
      const firstErr = firstError(s);
      base = `Run #${id} failed: ${firstErr}. See Activity for all ${e} error(s).`;
      text = base;
      live = base;
      break;
    case "interrupted":
      base = `${who} #${id} was interrupted: the process running it stopped before it finished. Check Queue for any drafts it saved, then start a new run.`;
      const reached = s ? knownCounts(s) : null;
      const got: string[] = [];
      if (reached?.scouted) got.push(`scouted ${sc}`);
      if (reached?.shortlisted) got.push(`shortlisted ${m}`);
      if (reached?.written) got.push(`wrote ${w}`);
      if (got.length > 0) {
        base += ` Got as far as: ${got.join(", ")}.`;
      }
      text = base;
      live = base;
      break;
    case "lost-contact":
      base = `Lost contact with the local API. Run #${id} may still be going; retrying\u2026`;
      text = base;
      live = base;
      break;
  }

  return { text, live };
}

/** Purpose: {stage} text from the B1 stage field; "" when unknown. */
function stageLabel(s: RunStatus | null): string {
  if (!s?.stage) return "";
  const stage = s.stage.toLowerCase();
  if (stage.startsWith("scout")) return "scouting";
  if (stage.startsWith("match")) return "matching";
  if (stage.startsWith("writ")) {
    const w = s.written ?? 0;
    const cap = s.write_cap;
    if (cap !== undefined && cap !== null) {
      return `writing letters (${w} written, cap ${cap})`;
    }
    return `writing letters (${w} written)`;
  }
  return "";
}

/** Purpose: First run error, redacted and cut to 120 characters. */
function firstError(s: RunStatus | null): string {
  const err = redactSecrets((s?.errors ?? [])[0] ?? "");
  if (err.length > 120) {
    return err.substring(0, 120) + "\u2026";
  }
  return err;
}
