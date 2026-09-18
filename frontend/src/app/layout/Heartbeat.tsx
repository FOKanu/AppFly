import type { HeartbeatState } from "../../shared/api/client";
import { Chip } from "../../shared/ui/Chip";

interface HeartbeatProps {
  state: HeartbeatState;
  message?: string;
}

const TONE: Record<HeartbeatState, "accent" | "warning" | "danger" | "muted" | "neutral"> = {
  running: "accent",
  "waiting-for-you": "warning",
  paused: "neutral",
  stopped: "danger",
  idle: "muted",
};

const LABEL: Record<HeartbeatState, string> = {
  running: "running",
  "waiting-for-you": "waiting-for-you",
  paused: "paused",
  stopped: "stopped",
  idle: "idle",
};

/**
 * Purpose: Header heartbeat chip, including the waiting-for-you state.
 * Does not: inspect the vault or decide which letters need review.
 */
export function Heartbeat({ state, message }: HeartbeatProps) {
  const pulsing = state === "running" || state === "waiting-for-you";
  return (
    <Chip
      className="heartbeat"
      tone={TONE[state]}
      dot
      pulse={pulsing}
      title={message}
      aria-label={`Heartbeat ${LABEL[state]}${message ? `: ${message}` : ""}`}
    >
      {LABEL[state]}
    </Chip>
  );
}
