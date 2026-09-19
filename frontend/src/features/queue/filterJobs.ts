import type { JobRecord, JobSource, JobStatus } from "./types";
import { JOB_SOURCES } from "./types";

/** Human labels for scout sources (Agentur API, Inbox, RSS, Apify · Impressum only). */
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

/**
 * Every filter the Queue toolbar can apply. All of these are real — the toolbar
 * used to render some of them as fixed decoration.
 */
export type QueueFilterState = {
  status: "all" | JobStatus;
  source: "all" | string;
  /** Free-text match on title, company or location. */
  query: string;
  /** Minimum match score on the 0–10 scale, or null for no floor. */
  minScore: number | null;
  /** Posting languages to keep, e.g. ["DE", "EN"]. Empty means any. */
  languages: string[];
  /** Substring match on location. Empty means any. */
  location: string;
};

/** A filter state with nothing applied. */
export const EMPTY_FILTERS: QueueFilterState = {
  status: "all",
  source: "all",
  query: "",
  minScore: null,
  languages: [],
  location: "",
};

/** Apply every active filter to a job list. */
export function filterJobs(jobs: JobRecord[], filters: QueueFilterState): JobRecord[] {
  const query = filters.query.trim().toLowerCase();
  const location = filters.location.trim().toLowerCase();

  return jobs.filter((job) => {
    if (filters.status !== "all" && job.status !== filters.status) return false;
    if (filters.source !== "all" && job.source !== filters.source) return false;

    if (query) {
      const haystack = `${job.title} ${job.company} ${job.location}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.minScore !== null && toTen(job.score) < filters.minScore) return false;

    if (filters.languages.length > 0) {
      const lang = (job.lang || "").toUpperCase();
      if (!filters.languages.includes(lang)) return false;
    }

    if (location && !job.location.toLowerCase().includes(location)) return false;

    return true;
  });
}

/** How many filters are currently narrowing the list. */
export function activeFilterCount(filters: QueueFilterState): number {
  return [
    filters.status !== "all",
    filters.source !== "all",
    filters.query.trim().length > 0,
    filters.minScore !== null,
    filters.languages.length > 0,
    filters.location.trim().length > 0,
  ].filter(Boolean).length;
}

/** Matcher scores arrive as a 0–1 cosine; filters compare on the 0–10 scale. */
function toTen(score: number | null): number {
  if (score == null) return 0;
  return score <= 1 ? score * 10 : score;
}

/** Display a 0–1 matcher score as a 0–100 integer, or an em dash. */
export function formatScore(score: number | null): string {
  if (score == null || Number.isNaN(score)) return "—";
  return String(Math.round(score * 100));
}
