/** Pipeline stage identifiers. */
export type StageId = "scout" | "match" | "write";

/** Stage lamp on the stepper. */
export type StageStatus =
  | "idle"
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "rate_limited";

/** One stepper stage. */
export interface Stage {
  id: StageId;
  label: string;
  status: StageStatus;
  count?: number;
  detail: string;
}

/** Job row from GET /jobs. Listing URLs are never fetched. */
export interface Job {
  source_id: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  status: string;
}

/** Copilot run from GET /runs. */
export interface Run {
  id: string;
  started_at: string;
  finished_at?: string;
  /** API status word, e.g. "completed", "completed_with_errors", "failed", "cancelled", "running". */
  status: string;
  /** Counts are unknown (undefined) when the row does not carry them - never 0. */
  scouted?: number;
  shortlisted?: number;
  skipped?: number;
  written?: number;
  write_skipped?: number;
  errors: string[];
  /** `run` for a pipeline run, `day_note` for a legacy Runs/YYYY-MM-DD.md note. */
  kind?: "run" | "day_note";
  /** Number of errors the API recorded for the run. */
  error_count?: number;
  gemini?: "ok" | "rate_limited" | "down";
  stages?: Record<StageId, StageStatus>;
}

/** GET /health. */
export interface Health {
  ok: boolean;
  api: "up" | "down";
  gemini?: "ready" | "rate_limited" | "missing";
}

/** Workflow view-model. */
export interface WorkflowSnapshot {
  health: Health;
  lastRun: Run | null;
  stages: Stage[];
  queued: Job[];
  rateLimited: boolean;
}

/** Fixture vs live API. */
export type DataSource = "api" | "mock";

/** Review states, including Gemini 429. */
export type PreviewState = "empty" | "running" | "failed" | "rate_limited";
