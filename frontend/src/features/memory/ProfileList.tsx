import { Chip } from "../../shared/ui/Chip";
import { TokenField } from "../../shared/ui/TokenField";

/** One saved search-preset profile. */
export interface SearchProfile {
  id: string;
  name: string;
  /** Second line, e.g. "B2B SaaS · payments · hybrid". */
  detail: string;
  shortlisted?: number;
  applied?: number;
  scoreFloor?: number;
}

interface ProfileListProps {
  profiles: SearchProfile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

interface SkipCompaniesProps {
  companies: string[];
  onChange: (next: string[]) => void;
}

/**
 * Purpose: Saved search presets — one profile per role you hunt for.
 * Does not: run a search; the nightly run uses the active profile.
 */
export function ProfileList({ profiles, activeId, onSelect, onNew }: ProfileListProps) {
  return (
    <section className="memory-card" aria-labelledby="profiles-title">
      <header className="memory-card__head">
        <div>
          <p className="memory-card__kicker">
            Memory · {profiles.length} profile{profiles.length === 1 ? "" : "s"}
          </p>
          <h2 id="profiles-title" className="memory-card__title">
            Search preset profiles
          </h2>
        </div>
        <button type="button" className="link-action memory-card__action" onClick={onNew}>
          + New profile
        </button>
      </header>

      {profiles.length === 0 ? (
        <p className="memory-card__empty">
          No profiles saved yet. A profile is the role, location and score floor one nightly run
          hunts for.
        </p>
      ) : (
        <ul className="profile-list">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <button
                type="button"
                className={profile.id === activeId ? "profile-row is-active" : "profile-row"}
                onClick={() => onSelect(profile.id)}
              >
                <span className="profile-row__head">
                  <span className="profile-row__name">{profile.name}</span>
                  {profile.id === activeId ? <Chip tone="accent">active</Chip> : null}
                </span>
                <span className="profile-row__detail">{profile.detail || "—"}</span>
                <span className="profile-row__stats">
                  <span>
                    shortlisted <b>{num(profile.shortlisted)}</b>
                  </span>
                  <span>
                    applied <b>{num(profile.applied)}</b>
                  </span>
                  <span>
                    score ≥ <b>{profile.scoreFloor?.toFixed(1) ?? "—"}</b>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Purpose: Companies skipped in every profile, shared across the vault.
 * Does not: affect the crawl deny-list, which is separate and code-enforced.
 */
export function SkipCompanies({ companies, onChange }: SkipCompaniesProps) {
  return (
    <section className="memory-card" aria-labelledby="skip-title">
      <header className="memory-card__head">
        <div>
          <p className="memory-card__kicker">Global · all profiles</p>
          <h2 id="skip-title" className="memory-card__title">
            Skip companies
          </h2>
        </div>
      </header>

      <TokenField
        values={companies}
        onChange={onChange}
        ariaLabel="Skip companies"
        placeholder="Add company to skip…"
      />

      <p className="memory-card__copy">
        Companies you skip anywhere are added here automatically and never resurface, in any
        profile.
      </p>
    </section>
  );
}

function num(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}
