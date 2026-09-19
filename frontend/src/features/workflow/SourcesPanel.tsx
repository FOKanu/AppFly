import { useState } from "react";
import { Switch } from "../../shared/ui/Switch";

/** One scout ingest channel. Never a deny-listed job board. */
export interface ScoutSource {
  id: string;
  name: string;
  detail: string;
  enabled: boolean;
}

interface SourcesPanelProps {
  sources: ScoutSource[];
  onToggle: (id: string, enabled: boolean) => void;
  /** Public company / Impressum pages Apify may visit. */
  startUrls: string[];
  onAddStartUrl: (url: string) => void;
}

interface CrawlPolicyProps {
  /** Hosts refused in code by backend/src/jobhunt/policy.py. */
  bannedHosts: readonly string[];
}

/**
 * Purpose: Scout sources — what the nightly run is allowed to read, plus the
 *          Apify start URLs.
 * Does not: decide policy; a banned host is refused in code before any request.
 */
export function SourcesPanel({
  sources,
  onToggle,
  startUrls,
  onAddStartUrl,
}: SourcesPanelProps) {
  const [draft, setDraft] = useState("");

  function submit() {
    const next = draft.trim();
    if (!next) return;
    onAddStartUrl(next);
    setDraft("");
  }

  return (
    <section className="control-card" aria-labelledby="sources-title">
      <p className="control-card__kicker">Scout</p>
      <h2 id="sources-title" className="control-card__title">
        Sources
      </h2>

      <div className="source-rows">
        {sources.map((source) => (
          <div className="source-row" key={source.id}>
            <span className="source-row__col">
              <span className="source-row__name">{source.name}</span>
              <span className="source-row__detail">{source.detail}</span>
            </span>
            <Switch
              checked={source.enabled}
              onChange={(next) => onToggle(source.id, next)}
              label={source.name}
            />
          </div>
        ))}
      </div>

      <p className="control-card__label">Apify start URLs</p>
      {startUrls.length > 0 ? (
        startUrls.map((url) => (
          <p className="start-url" key={url}>
            {url}
          </p>
        ))
      ) : (
        <p className="start-url start-url--empty">No start URLs configured.</p>
      )}

      <div className="start-url-input">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Paste company or Impressum URL…"
          aria-label="Add an Apify start URL"
        />
        <button type="button" onClick={submit} aria-label="Add start URL">
          ↵
        </button>
      </div>
    </section>
  );
}

/**
 * Purpose: Read-only view of the crawl deny-list, so the policy is visible.
 * Does not: let the UI edit it — `policy.py` is the only source of truth.
 */
export function CrawlPolicyCard({ bannedHosts }: CrawlPolicyProps) {
  return (
    <section className="control-card control-card--policy" aria-labelledby="policy-title">
      <div className="control-card__head-row">
        <div>
          <p className="control-card__kicker control-card__kicker--policy">
            Crawl policy · read-only
          </p>
          <h2 id="policy-title" className="control-card__title">
            Banned hosts
          </h2>
        </div>
        <span className="enforced-tag">🔒 enforced in code</span>
      </div>

      <div className="banned-hosts">
        {bannedHosts.map((host) => (
          <span className="banned-host" key={host}>
            ⊘ {host}
          </span>
        ))}
      </div>

      <p className="control-card__copy">
        Any Apify start URL or inbox clip pointing at these hosts is refused before a request
        is made and logged as a policy refusal.
      </p>
    </section>
  );
}
