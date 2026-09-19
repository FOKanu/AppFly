import { Button } from "../../shared/ui/Button";
import type { ProfileVersion } from "./versionLedger";

interface VersionHistoryProps {
  versions: ProfileVersion[];
  onClear: () => void;
}

/**
 * Purpose: How the hunt profile has changed over time.
 * Does not: claim to be authoritative — entries come from this browser's local
 *           ledger, because the API has no version endpoint yet.
 */
export function VersionHistory({ versions, onClear }: VersionHistoryProps) {
  return (
    <section className="ledger-card" id="versions" aria-labelledby="versions-title">
      <header className="ledger-card__head">
        <div>
          <p className="ledger-card__kicker">Profile version history</p>
          <h2 id="versions-title" className="ledger-card__title">
            What you changed
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={versions.length === 0}>
          Clear
        </Button>
      </header>

      {versions.length === 0 ? (
        <p className="ledger-card__empty">
          No changes recorded yet. Editing your preset in Profiles adds an entry here.
        </p>
      ) : (
        <ol className="timeline">
          {versions.map((version) => (
            <li className="timeline__item" key={version.id}>
              <span className="timeline__dot" data-event={version.event} aria-hidden="true" />
              <div className="timeline__body">
                <p className="timeline__when">
                  {formatWhen(version.at)}
                  <span className="timeline__event">{version.event}</span>
                </p>
                <ul className="timeline__changes">
                  {version.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
                <p className="timeline__state">
                  {version.roleTitles.join(" · ") || "no role titles"} ·{" "}
                  {version.location || "no location"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="ledger-card__note">
        Local to this browser. The API has no profile-version endpoint yet, so this timeline is
        not synced or shared.
      </p>
    </section>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
