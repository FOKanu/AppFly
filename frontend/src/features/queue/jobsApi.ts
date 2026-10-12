import { apiBaseUrl, apiGet, apiFetch, APPFLY_HEADERS } from "../../shared/api/client";
import { describeApiError, isUnreachable } from "../../shared/api/errors";
import { cloneJob, MOCK_JOBS } from "./mockJobs";
import type { JobDetailResult, JobListResult, JobRecord, JobStatus } from "./types";
import { JOB_STATUSES } from "./types";

let mockStore: JobRecord[] = MOCK_JOBS.map(cloneJob);

/** Reset in-memory mocks (tests). Does not touch a live API. */
export function resetMockJobs(): void {
  mockStore = MOCK_JOBS.map(cloneJob);
}

/**
 * Local API origin for `/jobs`.
 * Uses `VITE_API_BASE_URL` — never Gemini, Agentur, or Apify keys.
 */
export function apiBase(): string {
  return apiBaseUrl();
}

function isStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && (JOB_STATUSES as readonly string[]).includes(value);
}

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function asScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asCrawlAllowed(raw: Record<string, unknown>): boolean {
  if (typeof raw.crawl_allowed === "boolean") return raw.crawl_allowed;
  if (typeof raw.crawl === "boolean") return raw.crawl;
  return true;
}

function letterExcerpt(raw: Record<string, unknown>): string {
  const excerpt = raw.letter_excerpt ?? raw.letterExcerpt;
  if (typeof excerpt === "string" && excerpt.trim()) return excerpt.trim();
  const letter = raw.letter;
  if (typeof letter === "string" && letter.trim() && !letter.includes("[[Letters/")) {
    return letter.trim().slice(0, 1200);
  }
  return "";
}

/** Normalize one GET/PATCH job payload into a Queue row. */
export function normalizeJob(raw: unknown): JobRecord {
  const row = (raw ?? {}) as Record<string, unknown>;
  const nested = row.job && typeof row.job === "object" ? (row.job as Record<string, unknown>) : row;
  const statusRaw = nested.status;
  const rawScore = asScore(nested.score ?? nested.match_score ?? nested.matchScore);
  const rawSkipReason = nested.skip_reason;

  // Apply legacy rule: if status is "skipped" and score is exactly 0, set score to null
  const score = (statusRaw === "skipped" && rawScore === 0) ? null : rawScore;

  return {
    source_id: asString(nested.source_id ?? nested.sourceId ?? nested.id),
    source: asString(nested.source, "unknown"),
    title: asString(nested.title, "Untitled"),
    company: asString(nested.company, "Unknown"),
    url: asString(nested.url),
    location: asString(nested.location),
    description: asString(nested.description ?? nested.description_excerpt ?? nested.excerpt ?? nested.body),
    status: isStatus(statusRaw) ? statusRaw : "inbox",
    score,
    letter_excerpt: letterExcerpt(nested),
    crawl_allowed: asCrawlAllowed(nested),
    lang: asString(nested.lang),
    salary: asString(nested.salary),
    posted: asString(nested.posted ?? nested.date),
    skip_reason: typeof rawSkipReason === "string" ? rawSkipReason : null,
  };
}

function normalizeList(raw: unknown): JobRecord[] {
  if (Array.isArray(raw)) return raw.map(normalizeJob).filter((job) => job.source_id);
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const list = obj.jobs ?? obj.items ?? obj.results;
    if (Array.isArray(list)) return list.map(normalizeJob).filter((job) => job.source_id);
  }
  return [];
}

/**
 * GET /jobs. Samples only when the API is offline/timeout (M7 / F2).
 * Does not send API keys.
 */
export async function listJobs(): Promise<JobListResult> {
  try {
    const raw = await apiGet<unknown>("/jobs");
    return { jobs: normalizeList(raw), usingMock: false };
  } catch (error) {
    const failure = describeApiError(error, "Loading jobs");
    if (isUnreachable(failure.kind)) {
      return { jobs: mockStore.map(cloneJob), usingMock: true };
    }
    throw failure;
  }
}

/**
 * GET /jobs/{source_id} — sealed: one job, not the vault.
 * Samples only when the API is offline/timeout.
 */
export async function getJob(sourceId: string): Promise<JobDetailResult> {
  try {
    const raw = await apiGet<unknown>(`/jobs/${encodeURIComponent(sourceId)}`);
    const job = normalizeJob(raw);
    if (!job.source_id) throw new Error("empty job");
    return { job, usingMock: false };
  } catch (error) {
    const failure = describeApiError(error, "Loading job", `Job ${sourceId} not found`);
    if (isUnreachable(failure.kind)) {
      const found = mockStore.find((job) => job.source_id === sourceId);
      if (!found) {
        throw failure;
      }
      return { job: cloneJob(found), usingMock: true };
    }
    throw failure;
  }
}

/**
 * PATCH /jobs/{source_id} with `{ status }` only.
 * Updates the mock store only when the live API is unreachable.
 */
export async function patchJobStatus(sourceId: string, status: JobStatus): Promise<JobRecord> {
  try {
    const raw = await apiFetch<unknown>(`/jobs/${encodeURIComponent(sourceId)}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...APPFLY_HEADERS,
      },
      body: JSON.stringify({ status }),
    });
    const job = normalizeJob(raw);
    return job.source_id ? job : { ...((await getJob(sourceId)).job), status };
  } catch (error) {
    const failure = describeApiError(error, "Updating job status");
    if (isUnreachable(failure.kind)) {
      const index = mockStore.findIndex((job) => job.source_id === sourceId);
      if (index < 0) throw failure;
      mockStore[index] = { ...mockStore[index], status };
      return cloneJob(mockStore[index]);
    }
    throw failure;
  }
}
