import { Chip } from "../../shared/ui/Chip";
import { Button } from "../../shared/ui/Button";
import type { HuntProfile } from "./types";

interface ProfileListProps {
  profiles: HuntProfile[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Why "+ New" is off: the API stores exactly one search preset. */
const SINGLE_PRESET_NOTE =
  "config.yaml holds one search preset. Storing several needs a /profiles endpoint.";

/**
 * Purpose: The presets you hunt as, with the active one marked.
 * Does not: create or delete presets — the local API has no endpoint for it.
 */
export function ProfileList({ profiles, activeId, onSelect }: ProfileListProps) {
  return (
    <section className="profile-card" aria-labelledby="presets-title">
      <header className="profile-card__head">
        <div>
          <p className="profile-card__kicker">
            {profiles.length} preset{profiles.length === 1 ? "" : "s"}
          </p>
          <h2 id="presets-title" className="profile-card__title">
            Hunt profiles
          </h2>
        </div>
        <Button variant="ghost" size="sm" disabled title={SINGLE_PRESET_NOTE}>
          + New
        </Button>
      </header>

      {profiles.length === 0 ? (
        <p className="profile-card__empty">
          No preset configured. Add a role title and location below, then save.
        </p>
      ) : (
        <ul className="preset-list">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <button
                type="button"
                className={profile.id === activeId ? "preset-row is-active" : "preset-row"}
                aria-current={profile.id === activeId || undefined}
                onClick={() => onSelect(profile.id)}
              >
                <span className="preset-row__head">
                  <span className="preset-row__name">{profile.name}</span>
                  {profile.id === activeId ? <Chip tone="accent">active</Chip> : null}
                </span>
                <span className="preset-row__detail">
                  {profile.secondaryTitles.join(" · ") || "single role title"}
                </span>
                <span className="preset-row__stats">
                  <span>
                    sources{" "}
                    <b>
                      {
                        [profile.sources.agentur, profile.sources.inbox].filter(Boolean)
                          .length
                      }
                    </b>
                  </span>
                  <span>
                    rss <b>{profile.sources.rss.length}</b>
                  </span>
                  <span>
                    cv <b>{profile.health.cvPresent ? "yes" : "no"}</b>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="profile-card__note">{SINGLE_PRESET_NOTE}</p>
    </section>
  );
}
