/**
 * Purpose: Per-run counts for one row; `null` means the row does not carry it (unknown, shown as a dash).
 * Does not: turn an unknown count into 0.
 */
export type RunRowCounts = {
  scouted: number | null;
  shortlisted: number | null;
  skipped: number | null;
  written: number | null;
  writeSkipped: number | null;
};

/**
 * Purpose: Pipeline counts taken from GET /runs log summaries.
 * Does not: include error text or secrets.
 */
export type RunFunnel = {
  scouted: number;
  shortlisted: number;
  skipped: number;
  written: number;
  writeSkipped: number;
};

/**
 * Purpose: One GET /runs summary after secret redaction.
 * Does not: keep raw API keys in `errors`.
 */
export type RunSummary = RunRowCounts & {
  id: string;
  date: string;
  started: string;
  finished: string;
  model: string;
  errors: string[];
  path: string;
  ok: boolean;
  /** `run` for a pipeline run row, `day_note` for a legacy Runs/YYYY-MM-DD.md note (and the mock rows). */
  kind: "run" | "day_note";
  /** API status word, e.g. "running", "completed", "failed", "cancelled"; "" when absent. */
  status: string;
  /** Errors the API recorded (`error_count`), else the number of error strings. */
  errorCount: number;
  /** B3: the process running it stopped before it finished. */
  interrupted: boolean;
  /** B4: "api", "nightly" or "cli"; "" when absent. */
  trigger: string;
};

/**
 * Purpose: Aggregated funnel for the Activity header.
 * Does not: list individual jobs.
 */
export type FunnelView = RunFunnel & {
  jobs: {
    inbox: number;
    shortlist: number;
    draft: number;
    approved: number;
    applied: number;
    skipped: number;
  };
};

/**
 * Purpose: Page model for Activity & logs.
 * Does not: include connector keys.
 */
export type ActivityView = {
  runs: RunSummary[];
  funnel: FunnelView;
  source: "api" | "mock";
};
