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
export type RunSummary = RunFunnel & {
  id: string;
  date: string;
  started: string;
  finished: string;
  model: string;
  errors: string[];
  path: string;
  ok: boolean;
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
