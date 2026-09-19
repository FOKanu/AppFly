import { Button } from "../../shared/ui/Button";
import { Segmented } from "../../shared/ui/Segmented";
import { TokenField } from "../../shared/ui/TokenField";
import { CAPABILITIES, NOT_PERSISTED_NOTE } from "./api";

/** Seniority band this profile hunts in. */
export type Seniority = "mid" | "senior" | "lead";

/** Where the role may be worked. */
export type WorkMode = "remote" | "hybrid" | "onsite";

/** The editable slice of a profile. Only some of it reaches the backend. */
export interface ProfileSettingsValue {
  roleTitles: string[];
  location: string;
  seniority: Seniority;
  /** Annual floor in euros, or null when unset. */
  salaryFloor: number | null;
  workMode: WorkMode;
}

interface ProfileSettingsProps {
  value: ProfileSettingsValue;
  onChange: (next: ProfileSettingsValue) => void;
  /** True while a PUT is in flight. */
  saving: boolean;
  /** Fields that differ from what the server last returned. */
  dirty: boolean;
  onSave: () => void;
  onRevert: () => void;
}

const SENIORITY = [
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead+" },
] as const;

const WORK_MODES = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
] as const;

/**
 * Purpose: Edit the search preset — role titles and location save for real via
 *          PUT /settings; the rest is shown but marked unsupported.
 * Does not: pretend to persist fields the backend has no column for.
 */
export function ProfileSettings({
  value,
  onChange,
  saving,
  dirty,
  onSave,
  onRevert,
}: ProfileSettingsProps) {
  return (
    <section className="profile-card" id="edit" aria-labelledby="preset-title">
      <header className="profile-card__head">
        <div>
          <p className="profile-card__kicker">Search preset</p>
          <h2 id="preset-title" className="profile-card__title">
            What the scout looks for
          </h2>
        </div>
        <span className="profile-card__saved">
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
      </header>

      <div className="profile-grid">
        <div>
          <p className="profile-label">
            Role titles <span className="profile-label__live">saves to config.yaml</span>
          </p>
          <TokenField
            values={value.roleTitles}
            onChange={(roleTitles) => onChange({ ...value, roleTitles })}
            ariaLabel="Role titles"
          />

          <p className="profile-label">
            Location <span className="profile-label__live">saves to config.yaml</span>
          </p>
          <input
            className="profile-input"
            value={value.location}
            placeholder="Berlin"
            aria-label="Location"
            onChange={(event) => onChange({ ...value, location: event.target.value })}
          />
        </div>

        <div>
          <p className="profile-label">
            Seniority <UnsupportedTag />
          </p>
          <Segmented
            options={SENIORITY}
            value={value.seniority}
            onChange={(seniority) => onChange({ ...value, seniority })}
            ariaLabel="Seniority"
            disabled={!CAPABILITIES.seniority}
            disabledReason={NOT_PERSISTED_NOTE}
          />

          <p className="profile-label">
            Work mode <UnsupportedTag />
          </p>
          <Segmented
            options={WORK_MODES}
            value={value.workMode}
            onChange={(workMode) => onChange({ ...value, workMode })}
            ariaLabel="Work mode"
            disabled={!CAPABILITIES.workMode}
            disabledReason={NOT_PERSISTED_NOTE}
          />

          <p className="profile-label">
            Salary floor <UnsupportedTag />
          </p>
          <div className="salary-field" data-disabled="true">
            <span aria-hidden="true">€</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={value.salaryFloor ?? ""}
              placeholder="not stored"
              aria-label="Salary floor in euros"
              disabled={!CAPABILITIES.salaryFloor}
              title={NOT_PERSISTED_NOTE}
              onChange={(event) =>
                onChange({
                  ...value,
                  salaryFloor: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </div>
        </div>
      </div>

      <footer className="profile-card__footer">
        <p className="profile-card__note">{NOT_PERSISTED_NOTE}</p>
        <Button variant="ghost" onClick={onRevert} disabled={!dirty || saving}>
          Revert
        </Button>
        <Button variant="primary" onClick={onSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save preset"}
        </Button>
      </footer>
    </section>
  );
}

/** Marks a field the backend cannot store yet. */
function UnsupportedTag() {
  return (
    <span className="profile-label__unsupported" title={NOT_PERSISTED_NOTE}>
      not stored yet
    </span>
  );
}
