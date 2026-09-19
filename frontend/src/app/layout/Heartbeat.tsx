import type { HeartbeatState } from "../../shared/api/client";
import { Chip } from "../../shared/ui/Chip";

interface HeartbeatProps {
  state: HeartbeatState;
  message?: string;
}

const TONE: Record<HeartbeatState, "accent" | "ok" | "danger" | "muted" | "neutral"> = {
  running: "accent",
  "waiting-for-you": "ok",
  paused: "neutral",
  stopped: "danger",
  idle: "muted",
};

/**
 * Purpose: Header heartbeat pill — the state machine the jobhunt CLI emits.
 * Does not: inspect the vault or decide which letters need review.
 */
export function Heartbeat({ state, message }: HeartbeatProps) {
  const pulsing = state === "running" || state === "waiting-for-you";
  return (
    <Chip
      className="heartbeat"
      tone={TONE[state]}
      size="lg"
      dot
      pulse={pulsing}
      title={message}
      aria-label={`Heartbeat ${state}${message ? `: ${message}` : ""}`}
    >
      {state}
    </Chip>
  );
}
