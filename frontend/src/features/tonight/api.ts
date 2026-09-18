import { MOCK_DRAFTS, MOCK_RUN, MOCK_SHORTLIST, MOCK_TONIGHT } from "./mock";
import type { DataSource, Health, Job, Run, TonightSnapshot } from "./types";

const API_BASE = "/api";

/**
 * GET helper that never follows job-board URLs.
 * On network / non-OK responses, returns mock so the dashboard still paints.
 */
async function getJson<T>(path: string, fallback: T): Promise<{ data: T; source: DataSource }> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return { data: (await response.json()) as T, source: "api" };
  } catch {
    return { data: fallback, source: "mock" };
  }
}

function asJobList(payload: unknown): Job[] {
  if (Array.isArray(payload)) {
    return payload as Job[];
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { jobs?: unknown }).jobs)) {
    return (payload as { jobs: Job[] }).jobs;
  }
  return [];
}

function asRunList(payload: unknown): Run[] {
  if (Array.isArray(payload)) {
    return payload as Run[];
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { runs?: unknown }).runs)) {
    return (payload as { runs: Run[] }).runs;
  }
  return [];
}

/**
 * Load Tonight dashboard data from the local API, with mock fallback.
 */
export async function fetchTonight(): Promise<{ data: TonightSnapshot; source: DataSource }> {
  const health = await getJson<Health>("/health", MOCK_TONIGHT.health);
  const runs = await getJson<unknown>("/runs", { runs: [MOCK_RUN] });
  const drafts = await getJson<unknown>("/jobs?status=draft", { jobs: MOCK_DRAFTS });
  const shortlist = await getJson<unknown>("/jobs?status=shortlist", { jobs: MOCK_SHORTLIST });

  const runList = asRunList(runs.data);
  const source: DataSource =
    health.source === "api" && runs.source === "api" ? "api" : "mock";

  return {
    source,
    data: {
      health: health.data,
      lastRun: runList[0] ?? null,
      drafts: asJobList(drafts.data),
      shortlist: asJobList(shortlist.data),
    },
  };
}
