import type { JobRecord, JobSource, JobStatus } from "./types";
import { JOB_SOURCES } from "./types";

/** Human labels for scout sources (FigJam: Agentur API, Inbox, RSS, Apify · Impressum only). */
export const SOURCE_LABELS: Record<JobSource, string> = {
  agentur: "Agentur API",
  inbox: "Inbox",
  rss: "RSS",
  apify: "Apify · Impressum only",
};

/** Badge copy for a job source, including unknown keys. */
export function sourceLabel(source: string): string {
  if ((JOB_SOURCES as readonly string[]).includes(source)) {
    return SOURCE_LABELS[source as JobSource];
  }
  return source;
}

/** Filters applied by QueueFilters. */
export type QueueFilterState = {
  status: "all" | JobStatus;
  source: "all" | string;
};

/** Apply status + source chips to a job list. */
export function filterJobs(jobs: JobRecord[], filters: QueueFilterState): JobRecord[] {
  return jobs.filter((job) => {
    if (filters.status !== "all" && job.status !== filters.status) return false;
    if (filters.source !== "all" && job.source !== filters.source) return false;
    return true;
  });
}

/** Display a 0–1 matcher score as a 0–100 integer, or an em dash. */
export function formatScore(score: number | null): string {
  if (score == null || Number.isNaN(score)) return "—";
  return String(Math.round(score * 100));
}
