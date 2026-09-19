import { useEffect, useMemo, useState } from "react";
import { loadActivity } from "./api";
import { ExecutionLog, type LogEvent } from "./ExecutionLog";
import { FunnelSummary } from "./FunnelSummary";
import { PolicyRefusals, type PolicyRefusal } from "./PolicyRefusals";
import { RunList } from "./RunList";
import type { ActivityView, RunSummary } from "./types";
import "./activity.css";

/** The funnel and refusal cards report on this window. */
const WINDOW_DAYS = 30;

/**
 * Purpose: Activity & logs — conversion funnel, policy refusals, run history,
 *          and the mono execution log.
 * Does not: display API keys, start Easy Apply, or crawl deny-listed hosts.
 */
export function ActivityPage() {
  const [view, setView] = useState<ActivityView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AppFly · Activity";
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadActivity()
      .then((data) => {
        if (!cancelled) setView(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load activity");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runs = view?.runs ?? [];
  const events = useMemo(() => eventsFrom(runs), [runs]);
  const refusals = useMemo(() => refusalsFrom(runs), [runs]);

  if (error) {
    return (
      <div className="activity">
        <p className="activity__banner" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="activity" aria-busy={view ? undefined : true}>
      {view?.source === "mock" ? (
        <p className="activity__banner" role="status">
          Local API unreachable — showing sample run history with secrets already stripped.
        </p>
      ) : null}

      <div className="activity__columns">
        <div className="activity__col">
          <FunnelSummary
            funnel={view?.funnel ?? EMPTY_FUNNEL}
            windowDays={WINDOW_DAYS}
          />
          <PolicyRefusals
            refusals={refusals}
            windowDays={WINDOW_DAYS}
            fetchesAttempted={0}
          />
          <RunList runs={runs} />
        </div>

        <div className="activity__col">
          <ExecutionLog
            events={events}
            totalEvents={events.length}
            onExport={() => undefined}
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY_FUNNEL: ActivityView["funnel"] = {
  scouted: 0,
  shortlisted: 0,
  skipped: 0,
  written: 0,
  writeSkipped: 0,
  jobs: { inbox: 0, shortlist: 0, draft: 0, approved: 0, applied: 0, skipped: 0 },
};

/**
 * Purpose: Flatten run summaries into execution-log lines.
 * Does not: un-redact anything — `errors` arrive already stripped of secrets.
 */
function eventsFrom(runs: RunSummary[]): LogEvent[] {
  return runs.flatMap((run) => {
    const time = clock(run.finished || run.started);
    const lines: LogEvent[] = [
      {
        id: `${run.id}-core`,
        time,
        channel: "core",
        level: run.ok ? "info" : "error",
        message: `run ${run.id} ${run.ok ? "finished" : "failed"} · ${run.model || "writer —"}`,
      },
      {
        id: `${run.id}-scout`,
        time,
        channel: "scout",
        level: "info",
        message: `scouted ${run.scouted} listings`,
      },
      {
        id: `${run.id}-match`,
        time,
        channel: "match",
        level: "info",
        message: `shortlisted ${run.shortlisted} · skipped ${run.skipped}`,
      },
      {
        id: `${run.id}-write`,
        time,
        channel: "write",
        level: run.writeSkipped > 0 ? "warn" : "info",
        message: `wrote ${run.written} letters${run.writeSkipped > 0 ? `, ${run.writeSkipped} fell back to local` : ""}`,
      },
    ];

    run.errors.forEach((message, index) => {
      lines.push({
        id: `${run.id}-err-${index}`,
        time,
        channel: isPolicy(message) ? "scout" : "core",
        level: isPolicy(message) ? "block" : "error",
        message,
      });
    });

    return lines;
  });
}

/** Refusals are the policy-shaped errors a run reported. */
function refusalsFrom(runs: RunSummary[]): PolicyRefusal[] {
  return runs.flatMap((run) =>
    run.errors
      .filter(isPolicy)
      .map((message, index) => ({
        id: `${run.id}-refusal-${index}`,
        target: message,
        context: `${run.date || run.id} · crawl policy`,
      })),
  );
}

function isPolicy(message: string): boolean {
  return /refus|banned|deny|policy/i.test(message);
}

function clock(value: string): string {
  const match = value.match(/T(\d{2}:\d{2}:\d{2})/) ?? value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "—";
}
