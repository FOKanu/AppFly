import { apiBaseUrl, APPFLY_HEADERS } from "../../shared/api/client";
import { MOCK_QUEUED, MOCK_RUN, MOCK_WORKFLOW } from "./mock";
import type { DataSource, Health, Job, Run, Stage, StageStatus, WorkflowSnapshot } from "./types";

async function getJson<T>(path: string, fallback: T): Promise<{ data: T; source: DataSource }> {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
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

function asHealth(payload: unknown): Health {
  const ok = Boolean(payload && typeof payload === "object" && (payload as { ok?: boolean }).ok);
  return { ok, api: ok ? "up" : "down" };
}

/** Purpose: Legacy Runs/YYYY-MM-DD.md note as a Run (counts 0, stages done), kind "day_note". */
function dayNote(row: Record<string, unknown>): Run {
  const failed = Boolean(row.has_errors);
  return {
    id: String(row.path ?? row.date),
    started_at: String(row.date ?? ""),
    status: failed ? "failed" : "ok",
    scouted: 0,
    shortlisted: 0,
    skipped: 0,
    written: 0,
    write_skipped: 0,
    errors: failed && typeof row.preview === "string" ? [row.preview] : [],
    stages: {
      scout: "done",
      match: "done",
      write: failed ? "failed" : "done",
    },
    kind: "day_note",
  };
}

function runFromLog(item: unknown): Run | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  if (row.kind === "day_note" && typeof row.date === "string") {
    return dayNote(row);
  }
  if (
    typeof row.id === "string" &&
    row.id !== "" &&
    typeof row.status === "string" &&
    row.kind === "run"
  ) {
    const counts = (row.counts && typeof row.counts === "object" ? row.counts : {}) as Record<string, unknown>;
    const count = (key: string): number | undefined =>
      typeof counts[key] === "number" ? (counts[key] as number) : undefined;
    return {
      id: row.id,
      started_at: typeof row.started_at === "string" && row.started_at ? row.started_at : String(row.date ?? ""),
      finished_at: typeof row.finished_at === "string" && row.finished_at ? row.finished_at : undefined,
      status: row.status,
      scouted: count("scouted"),
      shortlisted: count("matched"),
      written: count("written"),
      errors: [],
      error_count: typeof row.error_count === "number" ? row.error_count : undefined,
      kind: "run",
    };
  }
  if (typeof row.date === "string") {
    return dayNote(row);
  }
  if (typeof row.id === "string" && typeof row.status === "string") {
    return item as Run;
  }
  return null;
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
      detail: `${run.shortlisted ?? "\u2014"} shortlist \u00b7 ${run.skipped ?? "\u2014"} skipped`,
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
          : `${run.written ?? "\u2014"} letters`,
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

  const runList = asList<unknown>(runs.data, "runs")
    .map(runFromLog)
    .filter((row): row is Run => row !== null);
  // H1/H2: the heartbeat reads the latest pipeline run, never a day note.
  const lastRun = runList.find((row) => row.kind !== "day_note") ?? null;
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
        health: asHealth(health.data),
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
      health: asHealth(health.data),
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
    const response = await fetch(`${apiBaseUrl()}/runs`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...APPFLY_HEADERS },
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
