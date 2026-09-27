/**
 * Purpose: The one shared run controller, provided by AppShell and read with useRun() (UI spec G11).
 * Does not: start runs by itself; AppShell's useRunController owns the requests.
 */
import { createContext, useContext } from "react";
import type { HeartbeatState } from "../api/client";
import type { CvOption, RunCounts, RunStage, RunUiState } from "./types";

/** Pinned interface for W2-B: the G11 fields plus what the RunningBar needs. */
export interface RunController {
  ui: RunUiState;
  runId: string | null;
  /** B1 stage from the last poll while the run is going (also while stopping or out of contact); null otherwise. */
  stage: RunStage | null;
  /** Visible run line (sections 4 to 6), ticking while a run is active. */
  message: string;
  /** Same line without the elapsed time; changes only on a UI state change (G1a). */
  liveMessage: string;
  /** LED for the heartbeat pill and the RunningBar. */
  led: HeartbeatState;
  counts: RunCounts;
  /** Writer model when known, else "". */
  model: string;
  /** Formatted elapsed time, "" when no run is shown. */
  elapsed: string;
  /** True after 60 s of an active run: the RunningBar run field links to Activity. */
  linkToActivity: boolean;
  runDisabled: boolean;
  runTitle: string;
  stopDisabled: boolean;
  stopLabel: string;
  stopTitle: string;
  start: () => void;
  stop: () => void;
  /** CV selection for the run. */
  cvId: string | null;
  setCvId: (id: string | null) => void;
  cvOptions: CvOption[];
  cvState: "loading" | "ready" | "empty" | "error" | "offline";
  cvLabel: string;
}

/** Value used outside AppShell (and before it mounts): idle, both controls inert. */
export const IDLE_RUN: RunController = {
  ui: "idle",
  runId: null,
  stage: null,
  message: "Idle \u00b7 no run in progress",
  liveMessage: "Idle \u00b7 no run in progress",
  led: "idle",
  counts: {},
  model: "",
  elapsed: "",
  linkToActivity: false,
  runDisabled: true,
  runTitle: "",
  stopDisabled: true,
  stopLabel: "Stop",
  stopTitle: "No run in progress.",
  start: () => {},
  stop: () => {},
  cvId: null,
  setCvId: () => {},
  cvOptions: [],
  cvState: "loading",
  cvLabel: "",
};

export const RunContext = createContext<RunController>(IDLE_RUN);

/**
 * Purpose: Read the shared run controller (Workflow and the chrome use the same one).
 * Does not: create a second controller.
 */
export function useRun(): RunController {
  return useContext(RunContext);
}
