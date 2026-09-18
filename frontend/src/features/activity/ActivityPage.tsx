import { useEffect, useState } from "react";
import { loadActivity } from "./api";
import { FunnelSummary } from "./FunnelSummary";
import { RunList } from "./RunList";
import type { ActivityView } from "./types";
import "./activity.css";

/**
 * Purpose: Activity & logs — run history, funnel, redacted errors from GET /runs.
 * Does not: display API keys, start Easy Apply, or crawl deny-listed hosts.
 */
export function ActivityPage() {
  const [view, setView] = useState<ActivityView | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return (
      <section className="page">
        <header>
          <h1>Activity & logs</h1>
        </header>
        <p className="banner" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!view) {
    return (
      <section className="page" aria-busy="true">
        <header>
          <h1>Activity & logs</h1>
          <p className="lede status">Loading run history…</p>
        </header>
      </section>
    );
  }

  return (
    <section className="page">
      <header>
        <h1>Activity & logs</h1>
        <p className="lede">
          Pipeline history from GET /runs. Error text is redacted so API keys never reach the DOM.
        </p>
      </header>
      {view.source === "mock" ? (
        <p className="banner" role="status">
          Local API unreachable — showing sample run history with secrets already stripped.
        </p>
      ) : null}
      <FunnelSummary funnel={view.funnel} />
      <RunList runs={view.runs} />
    </section>
  );
}
