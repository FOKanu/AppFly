import { MOCK_QUEUED, MOCK_RUN, MOCK_WORKFLOW } from "./mock";
import type { DataSource, Health, Job, Run, Stage, StageStatus, WorkflowSnapshot } from "./types";

const API_BASE = "/api";

/**
 * JSON GET against the local copilot API. Falls back to fixtures if the API is down.
 * Never requests job-board hosts.
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

function asList<T>(payload: unknown, key: "jobs" | "runs"): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const nested = (payload as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

function stageFromRun(run: Run): Stage[] {
  const statusOf = (id: Stage["id"], fallback: StageStatus): StageStatus =>
    run.stages?.[id] ?? fallback;
  return [
    {
      id: "scout",
      label: "Scout",
      status: statusOf("scout", run.status === "running" ? "running" : "done"),
      count: run.scouted,
      detail: "API · RSS · clips",
    },
    {
      id: "match",
      label: "Match",
      status: statusOf("match", "done"),
      count: run.shortlisted,
      detail: `${run.shortlisted} shortlist · ${run.skipped} skipped`,
    },
    {
      id: "write",
      label: "Write",
      status: statusOf(
        "write",
        run.gemini === "rate_limited" ? "rate_limited" : "done",
      ),
      count: run.written,
      detail:
        run.gemini === "rate_limited"
          ? "Gemini rate-limited"
          : `${run.written} letters`,
    },
  ];
}

/**
 * Load Workflow snapshot: health, latest run, draft/shortlist/inbox jobs.
 */
export async function fetchWorkflow(): Promise<{ data: WorkflowSnapshot; source: DataSource }> {
  const health = await getJson<Health>("/health", MOCK_WORKFLOW.health);
  const runs = await getJson<unknown>("/runs", { runs: [MOCK_RUN] });
  const shortlist = await getJson<unknown>("/jobs?status=shortlist", { jobs: [] });
  const drafts = await getJson<unknown>("/jobs?status=draft", { jobs: [] });
  const inbox = await getJson<unknown>("/jobs?status=inbox", { jobs: MOCK_QUEUED });

  const runList = asList<Run>(runs.data, "runs");
  const lastRun = runList[0] ?? null;
  const draftJobs = asList<Job>(drafts.data, "jobs");
  const queued = [
    ...asList<Job>(inbox.data, "jobs"),
    ...asList<Job>(shortlist.data, "jobs").filter((job) => job.status === "inbox"),
  ];
  const source: DataSource =
    health.source === "api" && runs.source === "api" ? "api" : "mock";

  if (!lastRun) {
    return {
      source,
      data: {
        health: health.data,
        lastRun: null,
        stages: MOCK_WORKFLOW.stages.map((stage) => ({ ...stage, status: "idle", count: 0 })),
        queued,
        rateLimited: false,
      },
    };
  }

  const rateLimited =
    lastRun.gemini === "rate_limited" || health.data.gemini === "rate_limited";
  const stages = stageFromRun(lastRun);
  if (!lastRun.written && draftJobs.length) {
    stages[2] = { ...stages[2], count: draftJobs.length };
  }

  return {
    source,
    data: {
      health: health.data,
      lastRun,
      stages,
      queued,
      rateLimited,
    },
  };
}

export interface RetryResult {
  ok: boolean;
  message: string;
}

/**
 * Retry the Gemini write stage via the local API. Does not scrape or open listing URLs.
 */
export async function retryGemini(): Promise<RetryResult> {
  try {
    const response = await fetch(`${API_BASE}/write`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ retry: true }),
    });
    if (response.status === 429) {
      return { ok: false, message: "Gemini still rate-limited" };
    }
    if (!response.ok) {
      return { ok: false, message: "Retry failed, API down" };
    }
    return { ok: true, message: "Write stage re-queued" };
  } catch {
    return { ok: false, message: "Retry failed, API down" };
  }
}
