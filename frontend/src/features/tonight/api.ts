import { apiBaseUrl } from "../../shared/api/client";
import { MOCK_DRAFTS, MOCK_RUN, MOCK_SHORTLIST, MOCK_TONIGHT } from "./mock";
import type { DataSource, Health, Job, Run, StageStatus, TonightSnapshot } from "./types";
import type { RunCounts } from "../../shared/run/types";

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
  // D5: only a real run row is a run; `kind: "day_note"` and older rows with a date keep the day-note branch.
  if (row.kind === "run" && typeof row.id === "string" && typeof row.status === "string") {
    return runFromRow(row);
  }
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
      kind: "day_note",
    };
  }
  if (typeof row.id === "string" && typeof row.status === "string") {
    return item as Run;
  }
  return null;
}

/**
 * Purpose: One real `kind: "run"` row (D5): id, status and counts from the row; counts it lacks stay undefined.
 * Does not: invent error strings (rows carry none, so refusals are unknown).
 */
function runFromRow(row: Record<string, unknown>): Run {
  const counts = (row.counts && typeof row.counts === "object" ? row.counts : {}) as Record<string, unknown>;
  const status = row.interrupted === true ? "interrupted" : String(row.status);
  // Spec sections 4 and 6: before B1 an active or interrupted run has no real counts yet.
  const unknown = status === "queued" || status === "running" || status === "interrupted";
  const count = (key: string): number | undefined =>
    !unknown && typeof counts[key] === "number" ? (counts[key] as number) : undefined;
  return {
    id: String(row.id),
    started_at: typeof row.started_at === "string" && row.started_at ? row.started_at : String(row.date ?? ""),
    finished_at: typeof row.finished_at === "string" && row.finished_at ? row.finished_at : undefined,
    status,
    scouted: count("scouted"),
    shortlisted: count("matched"),
    written: count("written"),
    errors: [],
    errorsKnown: false,
    stages: stagesFor(status),
    kind: "run",
  };
}

/** Purpose: D5 stage pills from a run status; a loaded queued/running run gets the D2 pre-B1 look. */
function stagesFor(status: string): Run["stages"] {
  const all = (value: StageStatus): Run["stages"] => ({ scout: value, match: value, write: value });
  switch (status) {
    case "completed":
    case "completed_with_errors":
      return all("done");
    case "cancelled":
      return all("stopped");
    case "failed":
    case "interrupted":
      return all("failed");
    case "queued":
    case "running":
      return all("in flight");
    default:
      return all("idle");
  }
}

/**
 * Purpose: D1 - the active run as Tonight shows it, built from the shared run controller.
 * Does not: read the loader; counts are only what useRun() reports (B1), else undefined.
 */
export function liveRun(runId: string | null, lostContact: boolean, counts: RunCounts): Run {
  return {
    id: runId ?? "",
    started_at: "",
    status: lostContact ? "lost-contact" : "running",
    scouted: counts.scouted,
    shortlisted: counts.matched,
    written: counts.written,
    errors: [],
    errorsKnown: false,
    stages: { scout: "in flight", match: "in flight", write: "in flight" },
    kind: "run",
  };
}

/** Purpose: D6 - true only for the backend's crawl-policy refusal text (policy.py). */
export function isCrawlRefusal(message: string): boolean {
  return /refused \S+: this host forbids scraping/.test(message);
}

/** Purpose: D6 - the run's real crawl refusals, or null when the run carries no error strings (unknown). */
export function refusalsOf(run: Run | null): string[] | null {
  if (!run || run.errorsKnown === false) return null;
  return run.errors.filter(isCrawlRefusal);
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
      // G3: the newest real run, else the newest day note.
      lastRun: runList.find((row) => row.kind === "run") ?? runList[0] ?? null,
      drafts: asJobList(drafts.data),
      shortlist: asJobList(shortlist.data),
      vaultPath: settings.data.vault_path ?? "",
    },
  };
}
