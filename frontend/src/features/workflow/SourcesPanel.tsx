import { Switch } from "../../shared/ui/Switch";

/** One scout ingest channel. Never a deny-listed job board. */
export interface ScoutSource {
  id: string;
  name: string;
  detail: string;
  enabled: boolean;
  /** True when PUT /settings cannot change this source. */
  readOnly?: boolean;
  /** Shown as the row's tooltip when it is read-only. */
  reason?: string;
}

interface SourcesPanelProps {
  sources: ScoutSource[];
  onToggle: (id: string, enabled: boolean) => void;
  /** True while a toggle is being written to config.yaml. */
  saving: boolean;
  /** Public company / Impressum pages Apify may visit; read-only here. */
  startUrls: string[];
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
export function SourcesPanel({ sources, onToggle, saving, startUrls }: SourcesPanelProps) {
  return (
    <section className="control-card" aria-labelledby="sources-title">
      <p className="control-card__kicker">Scout</p>
      <h2 id="sources-title" className="control-card__title">
        Sources
      </h2>
      <p className="control-card__note">
        {saving ? "Saving to config.yaml…" : "Toggles save to config.yaml."}
      </p>

      <div className="source-rows">
        {sources.map((source) => (
          <div
            className="source-row"
            key={source.id}
            title={source.readOnly ? source.reason : undefined}
          >
            <span className="source-row__col">
              <span className="source-row__name">{source.name}</span>
              <span className="source-row__detail">{source.detail}</span>
            </span>
            <Switch
              checked={source.enabled}
              onChange={(next) => onToggle(source.id, next)}
              label={source.name}
              disabled={saving || source.readOnly}
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

      <p className="control-card__note">
        Apify start URLs are read from config.yaml. PUT /settings does not accept them, so
        they cannot be edited here.
      </p>
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
