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
export type StageStatus = "idle" | "queued" | "running" | "in flight" | "stopped" | "done" | "failed";

/**
 * One job row from GET /jobs. URLs are stored and can be opened by the person;
 * this UI never fetches them.
 *
 * Everything below `score` is optional detail the Figma packet surfaces. The
 * API may not send it yet — screens render the field with an em dash rather
 * than hiding it, so the layout matches the design either way.
 */
export interface Job {
  source_id: string;
  source: string;
  title: string;
  company: string;
  location?: string;
  status: JobStatus;
  /** 0–10 match score, or a 0–1 cosine the UI rescales. */
  score?: number;
  /** Posting language, e.g. "EN" or "DE". */
  language?: string;
  /** Model that wrote the letter, e.g. "gemini-flash". */
  writer?: string;
  /** Human posted date, e.g. "posted 2 days ago". */
  posted?: string;
  /** Salary as printed on the posting. */
  salary?: string;
  /** One-line match rationale from the matcher. */
  whyMatched?: string;
  /** One-line gap summary from the matcher. */
  gaps?: string;
  /** Official posting URL, opened by the person in their own browser. */
  url?: string;
  /** Source reference id printed on the packet. */
  ref?: string;
  /** Hours/days since the listing landed, e.g. "2h". */
  age?: string;
}

/** One copilot run from GET /runs. */
export interface Run {
  id: string;
  started_at: string;
  finished_at?: string;
  /** API status word ("completed", "running", "cancelled", ...), "interrupted", or "lost-contact" for the live run. */
  status: string;
  /** Counts are undefined when unknown (shown as a dash), never 0. */
  scouted?: number;
  shortlisted?: number;
  skipped?: number;
  written?: number;
  write_skipped?: number;
  /** Letter cap for the live run (from useRun counts); API rows carry none. Null or undefined means unknown. */
  write_cap?: number | null;
  errors: string[];
  /** False when the row carries no error strings (every GET /runs row), so refusals are unknown. */
  errorsKnown?: boolean;
  /** `run` for a pipeline run row, `day_note` for a legacy Runs/YYYY-MM-DD.md note. */
  kind?: "run" | "day_note";
  source_mix?: Record<SourceChannel, number>;
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
  /** Absolute vault root, used to name Home.md. Empty when the API is down. */
  vaultPath: string;
}

/** Where Tonight data came from. */
export type DataSource = "api" | "mock";

/** Forced review states via ?preview=. */
export type PreviewState = "empty" | "running" | "failed";
