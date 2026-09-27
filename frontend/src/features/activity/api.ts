import { apiBaseUrl } from "../../shared/api/client";
import { redactError, redactSecrets } from "./redact";
import type { ActivityView, FunnelView, RunFunnel, RunSummary } from "./types";

const JOB_STATUSES = ["inbox", "shortlist", "draft", "approved", "applied", "skipped"] as const;

/**
 * Purpose: Load run history and job-status funnel from GET /runs and GET /jobs.
 * Does not: start a pipeline run, display API keys, or crawl job boards.
 */
export async function loadActivity(): Promise<ActivityView> {
  try {
    const [runsPayload, jobsPayload] = await Promise.all([getJson("/runs"), getJson("/jobs")]);
    const runs = normalizeRuns(runsPayload);
    return {
      runs,
      funnel: buildFunnel(runs, jobsPayload),
      source: "api",
    };
  } catch {
    return { ...MOCK_ACTIVITY };
  }
}

/**
 * Purpose: Normalize GET /runs arrays or `{ runs: [] }` wrappers.
 * Does not: keep unredacted error strings.
 */
export function normalizeRuns(payload: unknown): RunSummary[] {
  const list = unwrapList(payload, ["runs", "items", "results"]);
  const runs = list.map((item, index) => normalizeRun(item, index));
  return runs.sort((a, b) => compareStamp(b.started || b.date, a.started || a.date));
}

/**
 * Purpose: Combine latest-run pipeline counts with vault job-status counts.
 * Does not: fetch additional endpoints.
 */
export function buildFunnel(runs: RunSummary[], jobsPayload: unknown): FunnelView {
  const jobs = emptyJobCounts();
  const nested = asRecord(jobsPayload).counts ?? asRecord(jobsPayload).by_status;
  if (nested && typeof nested === "object") {
    for (const status of JOB_STATUSES) {
      const value = asRecord(nested)[status];
      if (typeof value === "number" && Number.isFinite(value)) jobs[status] = value;
    }
  } else {
    for (const item of unwrapList(jobsPayload, ["jobs", "items", "results"])) {
      const status = asString(asRecord(item).status);
      if ((JOB_STATUSES as readonly string[]).includes(status)) {
        jobs[status as (typeof JOB_STATUSES)[number]] += 1;
      }
    }
  }
  const pipeline = runs.reduce<RunFunnel>(
    (acc, run) => ({
      scouted: acc.scouted + (run.scouted ?? 0),
      shortlisted: acc.shortlisted + (run.shortlisted ?? 0),
      skipped: acc.skipped + (run.skipped ?? 0),
      written: acc.written + (run.written ?? 0),
      writeSkipped: acc.writeSkipped + (run.writeSkipped ?? 0),
    }),
    { scouted: 0, shortlisted: 0, skipped: 0, written: 0, writeSkipped: 0 },
  );
  return { ...pipeline, jobs };
}

const MOCK_RUNS_PAYLOAD = [
  {
    id: "2026-09-18",
    date: "2026-09-18",
    started: "2026-09-18T21:00:00+02:00",
    finished: "2026-09-18T21:04:12+02:00",
    scouted: 14,
    shortlisted: 8,
    skipped: 5,
    written: 5,
    write_skipped: 3,
    model: "gemini-2.5-flash",
    path: "Runs/2026-09-18.md",
    errors: [
      "write: GEMINI_API_KEY=AIzaSyFakeSecretThatMustNeverRender012345 is invalid",
      "scout: rss timeout for https://example.com/jobs/feed.xml",
    ],
  },
  {
    id: "2026-09-17",
    date: "2026-09-17",
    started: "2026-09-17T21:00:00+02:00",
    finished: "2026-09-17T21:03:40+02:00",
    scouted: 9,
    shortlisted: 6,
    skipped: 2,
    written: 4,
    write_skipped: 1,
    model: "gemini-2.5-flash",
    path: "Runs/2026-09-17.md",
    errors: [],
  },
  {
    id: "2026-09-16",
    date: "2026-09-16",
    started: "2026-09-16T21:00:00+02:00",
    finished: "2026-09-16T21:02:11+02:00",
    scouted: 7,
    shortlisted: 4,
    skipped: 3,
    written: 0,
    write_skipped: 4,
    model: "gemini-2.5-flash",
    path: "Runs/2026-09-16.md",
    errors: ["match: embedding model download still running"],
  },
];

const MOCK_JOB_COUNTS = {
  counts: {
    inbox: 11,
    shortlist: 6,
    draft: 4,
    approved: 2,
    applied: 3,
    skipped: 8,
  },
};

/**
 * Purpose: Sample run history used when the local API is unreachable.
 * Does not: keep the planted mock key in `runs[].errors`.
 */
export const MOCK_ACTIVITY: ActivityView = {
  source: "mock",
  runs: normalizeRuns(MOCK_RUNS_PAYLOAD),
  funnel: buildFunnel(normalizeRuns(MOCK_RUNS_PAYLOAD), MOCK_JOB_COUNTS),
};

function normalizeRun(item: unknown, index: number): RunSummary {
  const row = asRecord(item);
  const kind = asString(row.kind) === "run" ? "run" : "day_note";
  const status = asString(row.status);
  const counts = asRecord(row.counts);
  // Spec sections 4 and 6: before B1 the counts of an active or interrupted run are unknown, not 0.
  const countsUnknown =
    kind === "run" && (status === "queued" || status === "running" || row.interrupted === true);
  const started = asString(row.started ?? row.started_at ?? row.date);
  const date = asString(row.date, started.slice(0, 10) || `run-${index + 1}`);
  // C3: a run row's `preview` is never an error line; only real error strings are shown.
  const errorsRaw = Array.isArray(row.errors)
    ? row.errors
    : row.error
      ? [row.error]
      : kind === "day_note" && row.has_errors && typeof row.preview === "string"
        ? [row.preview]
        : [];
  const errors = errorsRaw.map((entry) => redactError(entry)).filter(Boolean);
  return {
    id: asString(row.id ?? row.path, date),
    date,
    started,
    finished: asString(row.finished ?? row.finished_at),
    scouted: countsUnknown ? null : countOf(row.scouted ?? counts.scouted),
    shortlisted: countsUnknown ? null : countOf(row.shortlisted ?? counts.matched),
    skipped: countOf(row.skipped),
    written: countsUnknown ? null : countOf(row.written ?? counts.written),
    writeSkipped: countOf(row.write_skipped ?? row.writeSkipped),
    model: redactSecrets(asString(row.model, "\u2014")),
    errors,
    path: asString(row.path, date ? `Runs/${date}.md` : ""),
    ok: errors.length === 0 && !row.has_errors && status.toLowerCase() !== "error",
    kind,
    status,
    errorCount: countOf(row.error_count) ?? errors.length,
    interrupted: row.interrupted === true,
    trigger: asString(row.trigger),
  };
}

function emptyJobCounts(): FunnelView["jobs"] {
  return { inbox: 0, shortlist: 0, draft: 0, approved: 0, applied: 0, skipped: 0 };
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return response.json();
}

function unwrapList(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Purpose: A count the row carries, else null (unknown). */
function countOf(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareStamp(left: string, right: string): number {
  return left.localeCompare(right);
}
