import { Switch } from "../../shared/ui/Switch";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";
import type { HuntProfile } from "./types";

import { BANNED_HOSTS } from "../../shared/policy";

interface ProfileRequirementsProps {
  profile: HuntProfile;
  onToggleSource: (key: "agentur" | "inbox", next: boolean) => void;
  savingSources: boolean;
}

/**
 * Purpose: The guardrails around this profile — which sources the scout may
 *          read, and the crawl deny-list it can never cross.
 * Does not: let the UI edit the deny-list. That lives in code.
 */
export function ProfileRequirements({
  profile,
  onToggleSource,
  savingSources,
}: ProfileRequirementsProps) {
  return (
    <section className="profile-card" id="requirements" aria-labelledby="requirements-title">
      <header className="profile-card__head">
        <div>
          <p className="profile-card__kicker">Requirements &amp; guardrails</p>
          <h2 id="requirements-title" className="profile-card__title">
            Where this profile may look
          </h2>
        </div>
        <span className="profile-card__saved">
          {savingSources ? "Saving…" : "saves to config.yaml"}
        </span>
      </header>

      <div className="source-rows">
        <SourceRow
          name="Arbeitsagentur Jobsuche API"
          detail="official API"
          checked={profile.sources.agentur}
          onChange={(next) => onToggleSource("agentur", next)}
          disabled={savingSources}
        />
        <SourceRow
          name="_inbox/ clips"
          detail="manual drops · URLs never fetched"
          checked={profile.sources.inbox}
          onChange={(next) => onToggleSource("inbox", next)}
          disabled={savingSources}
        />
        <SourceRow
          name="RSS feeds"
          detail={`${profile.sources.rss.length} allow-listed feed${profile.sources.rss.length === 1 ? "" : "s"}`}
          checked={profile.sources.rss.length > 0}
          onChange={() => undefined}
          disabled
          reason="Edit RSS feed URLs in config.yaml; this screen does not add feeds yet."
        />
        <SourceRow
          name="Apify · company pages"
          detail="public company / Impressum only"
          checked={profile.sources.apifyEnabled}
          onChange={() => undefined}
          disabled
          reason="PUT /settings does not accept the Apify toggle, so it is read-only here."
        />
      </div>

      <p className="profile-label">Match filters</p>
      <p className="profile-card__note">
        Skip companies, banned terms, must-have terms and the salary floor are set in{" "}
        <Link to={`${ROUTES.workflow}#requirements`}>Workflow → Requirements</Link>.
      </p>

      <p className="profile-label">Crawl deny-list · enforced in code</p>
      <div className="banned-hosts">
        {BANNED_HOSTS.map((host) => (
          <span className="banned-host" key={host}>
            ⊘ {host}
          </span>
        ))}
      </div>
      <p className="profile-card__note">
        Any start URL or inbox clip pointing at these hosts is refused before a request is made.
        This list is not editable from the UI, by design.
      </p>
    </section>
  );
}

function SourceRow({
  name,
  detail,
  checked,
  onChange,
  disabled,
  reason,
}: {
  name: string;
  detail: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <div className="source-row" title={disabled ? reason : undefined}>
      <span className="source-row__col">
        <span className="source-row__name">{name}</span>
        <span className="source-row__detail">{detail}</span>
      </span>
      <Switch checked={checked} onChange={onChange} label={name} disabled={disabled} />
    </div>
  );
}
