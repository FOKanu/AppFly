/** Job status values stored on vault notes / API jobs. */
export type JobStatus =
  | "inbox"
  | "shortlist"
  | "draft"
  | "approved"
  | "applied"
  | "skipped";

/** Ingest channel. API is Arbeitsagentur Jobsuche — never a deny-listed board. */
export type SourceChannel = "api" | "rss" | "clips";

/** Pipeline stage light used by the Tonight snapshot. */
export type StageStatus = "idle" | "queued" | "running" | "done" | "failed";

/** One job row from GET /jobs. URLs are never fetched by this UI. */
export interface Job {
  source_id: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  status: JobStatus;
  score?: number;
}

/** One copilot run from GET /runs. */
export interface Run {
  id: string;
  started_at: string;
  finished_at?: string;
  status: "ok" | "running" | "failed" | "empty";
  scouted: number;
  shortlisted: number;
  skipped: number;
  written: number;
  write_skipped: number;
  errors: string[];
  source_mix: Record<SourceChannel, number>;
  stages: {
    scout: StageStatus;
    match: StageStatus;
    write: StageStatus;
  };
}

/** GET /health payload. */
export interface Health {
  ok: boolean;
  api: "up" | "down";
}

/** Aggregated Tonight view-model. */
export interface TonightSnapshot {
  health: Health;
  lastRun: Run | null;
  drafts: Job[];
  shortlist: Job[];
}

/** Where Tonight data came from. */
export type DataSource = "api" | "mock";

/** Forced review states via ?preview=. */
export type PreviewState = "empty" | "running" | "failed";
