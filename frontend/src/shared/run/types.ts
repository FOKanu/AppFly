/**
 * Purpose: Types for the pipeline run API as the UI reads it (UI spec G10).
 * Does not: replace `RunResponse` in shared/api/client.ts, or carry API keys.
 */

/** UI run states from spec sections 4 and 6. `already active` and `run from elsewhere` render as queued / running. */
export type RunUiState =
  | "idle"
  | "starting"
  | "queued"
  | "running"
  | "cancelling"
  | "cancelled"
  | "completed"
  | "completed-empty"
  | "problems"
  | "failed"
  | "interrupted"
  | "lost-contact";

/** `POST /runs` reply (`AsyncRunAccepted`). */
export interface RunAccepted {
  id: string;
  status: string;
  started?: string;
  model?: string;
}

/** `GET /runs/{id}` (`AsyncRunStatus`), plus the optional B1 to B4 fields. */
export interface RunStatus {
  id: string;
  status: string;
  started?: string;
  finished?: string;
  scouted?: number;
  shortlisted?: number;
  skipped?: number;
  written?: number;
  write_skipped?: number;
  errors?: string[];
  model?: string;
  preview?: string;
  /** B1: current stage, e.g. "scout", "match", "write". */
  stage?: string;
  /** B1: the write cap for this run. */
  write_cap?: number;
  /** B3: the process running it stopped before it finished. */
  interrupted?: boolean;
  /** B4: "api", "nightly" or "cli". */
  trigger?: string;
}

/** One row of `GET /runs` (`RunLogSummary`), plus the optional B3 / B4 fields. */
export interface RunRow {
  id: string;
  status: string;
  started_at: string;
  counts: { scouted?: number; matched?: number; written?: number };
  error_count: number;
  /** `async:<id>` while the run lives in this API process. */
  path: string;
  kind?: string;
  interrupted?: boolean;
  trigger?: string;
}

/** RunningBar counts. `undefined` means unknown (shown as a dash), never zero. */
export interface RunCounts {
  scouted?: number;
  matched?: number;
  written?: number;
  writeCap?: number;
}
