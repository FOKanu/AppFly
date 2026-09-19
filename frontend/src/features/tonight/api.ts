import { apiBaseUrl } from "../../shared/api/client";
import { MOCK_DRAFTS, MOCK_RUN, MOCK_SHORTLIST, MOCK_TONIGHT } from "./mock";
import type { DataSource, Health, Job, Run, TonightSnapshot } from "./types";

/**
 * GET helper that never follows job-board URLs.
 * On network / non-OK responses, returns mock so the dashboard still paints.
 */
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

function asHealth(payload: unknown): Health {
  const ok = Boolean(payload && typeof payload === "object" && (payload as { ok?: boolean }).ok);
  return { ok, api: ok ? "up" : "down" };
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
    return payload.map(runFromPayload).filter((row): row is Run => row !== null);
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { runs?: unknown }).runs)) {
    return (payload as { runs: unknown[] }).runs
      .map(runFromPayload)
      .filter((row): row is Run => row !== null);
  }
  return [];
}

function runFromPayload(item: unknown): Run | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  if (typeof row.date === "string") {
    const failed = Boolean(row.has_errors);
    return {
      id: String(row.path ?? row.date),
      started_at: row.date,
      status: failed ? "failed" : "ok",
      scouted: 0,
      shortlisted: 0,
      skipped: 0,
      written: 0,
      write_skipped: 0,
      errors: failed && typeof row.preview === "string" ? [row.preview] : [],
      source_mix: { api: 0, rss: 0, clips: 0 },
      stages: {
        scout: "done",
        match: "done",
        write: failed ? "failed" : "done",
      },
    };
  }
  if (typeof row.id === "string" && typeof row.status === "string") {
    return item as Run;
  }
  return null;
}

/**
 * Load Tonight dashboard data from the local API, with mock fallback.
 */
export async function fetchTonight(): Promise<{ data: TonightSnapshot; source: DataSource }> {
  const health = await getJson<Health>("/health", MOCK_TONIGHT.health);
  const settings = await getJson<{ vault_path?: string }>("/settings", {});
  const runs = await getJson<unknown>("/runs", { runs: [MOCK_RUN] });
  const drafts = await getJson<unknown>("/jobs?status=draft", { jobs: MOCK_DRAFTS });
  const shortlist = await getJson<unknown>("/jobs?status=shortlist", { jobs: MOCK_SHORTLIST });

  const runList = asRunList(runs.data);
  const source: DataSource =
    health.source === "api" && runs.source === "api" ? "api" : "mock";

  return {
    source,
    data: {
      health: asHealth(health.data),
      lastRun: runList[0] ?? null,
      drafts: asJobList(drafts.data),
      shortlist: asJobList(shortlist.data),
      vaultPath: settings.data.vault_path ?? "",
    },
  };
}
