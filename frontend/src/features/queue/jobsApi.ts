import { apiBaseUrl, APPFLY_HEADERS } from "../../shared/api/client";
import { cloneJob, MOCK_JOBS } from "./mockJobs";
import type { JobDetailResult, JobListResult, JobRecord, JobStatus } from "./types";
import { JOB_STATUSES } from "./types";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  ...APPFLY_HEADERS,
} as const;

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

function jobsUrl(path: string): string {
  return `${apiBase()}${path}`;
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
  return {
    source_id: asString(nested.source_id ?? nested.sourceId ?? nested.id),
    source: asString(nested.source, "unknown"),
    title: asString(nested.title, "Untitled"),
    company: asString(nested.company, "Unknown"),
    url: asString(nested.url),
    location: asString(nested.location),
    description: asString(nested.description ?? nested.description_excerpt ?? nested.excerpt ?? nested.body),
    status: isStatus(statusRaw) ? statusRaw : "inbox",
    score: asScore(nested.score ?? nested.match_score ?? nested.matchScore),
    letter_excerpt: letterExcerpt(nested),
    crawl_allowed: asCrawlAllowed(nested),
    lang: asString(nested.lang),
    salary: asString(nested.salary),
    posted: asString(nested.posted ?? nested.date),
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
 * GET /jobs. Falls back to the sample queue when the API is down.
 * Does not send API keys.
 */
export async function listJobs(): Promise<JobListResult> {
  try {
    const res = await fetch(jobsUrl("/jobs"), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GET /jobs ${res.status}`);
    return { jobs: normalizeList(await res.json()), usingMock: false };
  } catch {
    return { jobs: mockStore.map(cloneJob), usingMock: true };
  }
}

/**
 * GET /jobs/{source_id} — sealed: one job, not the vault.
 * Falls back to the matching mock row when the API is down.
 */
export async function getJob(sourceId: string): Promise<JobDetailResult> {
  try {
    const res = await fetch(jobsUrl(`/jobs/${encodeURIComponent(sourceId)}`), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`GET /jobs/${sourceId} ${res.status}`);
    const job = normalizeJob(await res.json());
    if (!job.source_id) throw new Error("empty job");
    return { job, usingMock: false };
  } catch {
    const found = mockStore.find((job) => job.source_id === sourceId);
    if (!found) {
      throw new Error(`Job ${sourceId} not found`);
    }
    return { job: cloneJob(found), usingMock: true };
  }
}

/**
 * PATCH /jobs/{source_id} with `{ status }` only.
 * Updates the mock store when the live API is down.
 */
export async function patchJobStatus(sourceId: string, status: JobStatus): Promise<JobRecord> {
  try {
    const res = await fetch(jobsUrl(`/jobs/${encodeURIComponent(sourceId)}`), {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`PATCH /jobs/${sourceId} ${res.status}`);
    const job = normalizeJob(await res.json());
    return job.source_id ? job : { ...((await getJob(sourceId)).job), status };
  } catch {
    const index = mockStore.findIndex((job) => job.source_id === sourceId);
    if (index < 0) throw new Error(`Job ${sourceId} not found`);
    mockStore[index] = { ...mockStore[index], status };
    return cloneJob(mockStore[index]);
  }
}
