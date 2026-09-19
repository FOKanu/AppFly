import { useMemo, useState } from "react";
import { Button } from "../../shared/ui/Button";

/** Which pipeline stage an event came from. */
export type LogChannel = "core" | "scout" | "match" | "write" | "vault";

/** Severity of one execution-log line. */
export type LogLevel = "info" | "warn" | "error" | "block";

/** One line of the mono execution log. Never carries key material. */
export interface LogEvent {
  id: string;
  /** Local clock, e.g. "02:47:03". */
  time: string;
  channel: LogChannel;
  level: LogLevel;
  /** Already redacted by `redactSecrets`. */
  message: string;
}

interface ExecutionLogProps {
  events: LogEvent[];
  /** Total events on disk, which may exceed what is shown. */
  totalEvents: number;
  onExport: () => void;
}

const TABS = ["All", "Scout", "Match", "Write", "Vault", "Errors"] as const;
type LogTab = (typeof TABS)[number];

/**
 * Purpose: Mono execution log with channel tabs and a text filter.
 * Does not: render secrets — every message is redacted before it gets here.
 */
export function ExecutionLog({ events, totalEvents, onExport }: ExecutionLogProps) {
  const [tab, setTab] = useState<LogTab>("All");
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return events.filter((event) => {
      if (tab === "Errors" && event.level !== "error" && event.level !== "block") return false;
      if (tab !== "All" && tab !== "Errors" && event.channel !== tab.toLowerCase()) return false;
      if (needle && !event.message.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [events, tab, filter]);

  return (
    <section className="activity-card activity-card--log" aria-labelledby="log-title">
      <p className="activity-card__kicker">Activity · mono</p>
      <h2 id="log-title" className="activity-card__title">
        Execution log
      </h2>

      <div className="log-toolbar">
        <div className="log-tabs" role="tablist" aria-label="Log channel">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? "log-tab is-active" : "log-tab"}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <input
          className="log-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter log…"
          aria-label="Filter log"
        />
      </div>

      <div className="log-box">
        {visible.length === 0 ? (
          <p className="log-box__empty">No events match this filter.</p>
        ) : (
          visible.map((event) => (
            <p className="log-line" key={event.id} data-level={event.level}>
              <span className="log-line__time">{event.time}</span>
              <span className="log-line__channel">{event.channel}</span>
              <span className="log-line__level">{event.level}</span>
              <span className="log-line__message">{event.message}</span>
            </p>
          ))
        )}
      </div>

      <footer className="log-footer">
        <span>
          Showing {visible.length} of {totalEvents.toLocaleString()} events
        </span>
        <Button variant="ghost" onClick={onExport}>
          Export .log
        </Button>
      </footer>
    </section>
  );
}
