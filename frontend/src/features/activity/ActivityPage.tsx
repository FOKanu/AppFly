import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiFailure } from "../../shared/api/errors";
import { Banner } from "../../shared/ui/Banner";
import { SampleDataBanner } from "../../shared/ui/SampleDataBanner";
import { loadActivity } from "./api";
import { ExecutionLog, type LogEvent, type LogLevel } from "./ExecutionLog";
import { FunnelSummary } from "./FunnelSummary";
import { PolicyRefusals, type PolicyRefusal } from "./PolicyRefusals";
import { RunList } from "./RunList";
import { outcomeOf } from "./RunRow";
import type { ActivityView, RunSummary } from "./types";
import { ACTIVE_UI, id5 } from "../../shared/run/format";
import { useRun } from "../../shared/run/RunContext";
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
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const { ui } = useRun();
  const [reloadKey, setReloadKey] = useState(0);
  const previousUi = useRef(ui);

  // C6: re-load once each time the shared run leaves an active state, so a run that finishes while
  // this page is open stops reading `running`.
  useEffect(() => {
    const wasActive = ACTIVE_UI.has(previousUi.current);
    previousUi.current = ui;
    if (wasActive && !ACTIVE_UI.has(ui)) setReloadKey((key) => key + 1);
  }, [ui]);

  useEffect(() => {
    document.title = "AppFly · Activity";
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadActivity()
      .then((result) => {
        if (cancelled) return;
        if (result.source === "error") {
          setView(null);
          setFailure(result.failure);
          return;
        }
        setView(result.data);
        setFailure(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const runs = view?.runs ?? [];
  const events = useMemo(() => eventsFrom(runs), [runs]);
  const refusals = useMemo(() => refusalsFrom(runs), [runs]);

  if (failure) {
    return (
      <div className="activity">
        <Banner tone="danger" title="Couldn't load Activity" role="alert">
          {failure.message}
        </Banner>
      </div>
    );
  }

  return (
    <div className="activity" aria-busy={view ? undefined : true}>
      {view?.source === "mock" ? <SampleDataBanner noun="activity" /> : null}

      <div className="activity__columns">
        <div className="activity__col">
          <FunnelSummary
            funnel={view?.funnel ?? EMPTY_FUNNEL}
            windowDays={WINDOW_DAYS}
            loaded={Boolean(view)}
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
            onExport={() => downloadLog(events)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Purpose: Save the execution log as a .log file from the browser.
 * Does not: call the API — the lines are already in memory and already
 *           redacted, so this is a pure client-side download.
 */
function downloadLog(events: LogEvent[]): void {
  const body = events
    .map((event) => `${event.time}\t${event.channel}\t${event.level}\t${event.message}`)
    .join("\n");
  const blob = new Blob([`${body}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jobhunt-${new Date().toISOString().slice(0, 10)}.log`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
        level: coreLevel(run),
        message: coreMessage(run),
      },
      {
        id: `${run.id}-scout`,
        time,
        channel: "scout",
        level: "info",
        message: `scouted ${count(run.scouted)} listings`,
      },
      {
        id: `${run.id}-match`,
        time,
        channel: "match",
        level: "info",
        message: `shortlisted ${count(run.shortlisted)} \u00b7 skipped ${count(run.skipped)}`,
      },
      {
        id: `${run.id}-write`,
        time,
        channel: "write",
        // A skipped letter was already written or opted out; that is not a warning.
        level: "info",
        message: `wrote ${count(run.written)} letters${(run.writeSkipped ?? 0) > 0 ? `, ${run.writeSkipped} skipped (already written or opted out)` : ""}`,
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

/** Purpose: Core log level; run rows follow the chip (failed -> error, finished with problems -> warn). */
function coreLevel(run: RunSummary): LogLevel {
  if (run.kind !== "run") return run.ok ? "info" : "error";
  const { label } = outcomeOf(run);
  if (label === "failed") return "error";
  if (label === "finished with problems") return "warn";
  return "info";
}

/**
 * Purpose: Core log line. Run rows read `run #{id5} {chip label}`, day-note and mock rows
 *          `run {id} finished|failed`; both add ` \u00b7 {model}` only when the model is known.
 */
function coreMessage(run: RunSummary): string {
  if (run.kind !== "run") {
    const noteModel = run.model && run.model !== "\u2014" ? ` \u00b7 ${run.model}` : "";
    return `run ${run.id} ${run.ok ? "finished" : "failed"}${noteModel}`;
  }
  const model = run.model && run.model !== "\u2014" ? ` \u00b7 ${run.model}` : "";
  return `run #${id5(run.id)} ${outcomeOf(run).label}${model}`;
}

function isPolicy(message: string): boolean {
  return /refus|banned|deny|policy/i.test(message);
}

/** Purpose: A count for a log line, or a dash when the row does not carry it. */
function count(value: number | null): string {
  return value === null ? "\u2014" : String(value);
}

function clock(value: string): string {
  const match = value.match(/T(\d{2}:\d{2}:\d{2})/) ?? value.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "—";
}
