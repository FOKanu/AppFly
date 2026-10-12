/** Job pipeline statuses used by the vault and local API. */
import type { JobStatus } from "../../shared/status";
export { JOB_STATUSES, STATUS_LABELS, statusLabel } from "../../shared/status";
export type { JobStatus };

/** Scout ingest channels. Apify is Impressum / public career pages only. */
export const JOB_SOURCES = ["agentur", "inbox", "rss", "apify"] as const;

/** Source keys returned by GET /jobs. */
export type JobSource = (typeof JOB_SOURCES)[number];

/**
 * One queue row / sealed packet job.
 * Never includes CV, voice samples, or other jobs.
 */
export type JobRecord = {
  source_id: string;
  source: JobSource | string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  status: JobStatus;
  score: number | null;
  letter_excerpt: string;
  crawl_allowed: boolean;
  lang: string;
  salary: string;
  posted: string;
  skip_reason?: string | null;
};

/** Result of GET /jobs (live API or mock fallback). */
export type JobListResult = {
  jobs: JobRecord[];
  usingMock: boolean;
};

/** Result of GET /jobs/{source_id} — one job only. */
export type JobDetailResult = {
  job: JobRecord;
  usingMock: boolean;
};
