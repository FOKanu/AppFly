import { Button } from "../../shared/ui/Button";
import { Segmented } from "../../shared/ui/Segmented";
import { TokenField } from "../../shared/ui/TokenField";

/** Seniority band this profile hunts in. */
export type Seniority = "mid" | "senior" | "lead";

/** Where the role may be worked. */
export type WorkMode = "remote" | "hybrid" | "onsite";

/** Per-profile overrides of the global guardrails. */
export interface ProfileSettingsValue {
  roleTitles: string[];
  seniority: Seniority;
  /** Annual floor in euros, or null when unset. */
  salaryFloor: number | null;
  workMode: WorkMode;
}

interface ProfileSettingsProps {
  profileName: string;
  value: ProfileSettingsValue;
  onChange: (next: ProfileSettingsValue) => void;
  onDelete: () => void;
  onSave: () => void;
  /** Shown when the write endpoint is not available. */
  saveNote?: string;
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
 * Purpose: Per-profile settings — role titles, seniority, salary floor, work mode.
 * Does not: replace the global Requirements & guardrails; it only overrides them.
 */
export function ProfileSettings({
  profileName,
  value,
  onChange,
  onDelete,
  onSave,
  saveNote,
}: ProfileSettingsProps) {
  return (
    <section className="memory-card" aria-labelledby="profile-settings-title">
      <header className="memory-card__head">
        <div>
          <p className="memory-card__kicker">{profileName}</p>
          <h2 id="profile-settings-title" className="memory-card__title">
            Profile settings
          </h2>
        </div>
      </header>

      <div className="memory-grid">
        <div>
          <p className="memory-pane__label">Role titles</p>
          <TokenField
            values={value.roleTitles}
            onChange={(roleTitles) => onChange({ ...value, roleTitles })}
            ariaLabel="Role titles"
          />

          <p className="memory-pane__label">Salary floor</p>
          <div className="salary-field">
            <span aria-hidden="true">€</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={value.salaryFloor ?? ""}
              placeholder="not set"
              aria-label="Salary floor in euros"
              onChange={(event) =>
                onChange({
                  ...value,
                  salaryFloor: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </div>
          <p className="memory-card__copy">
            Uses global Requirements &amp; guardrails unless overridden here.
          </p>
        </div>

        <div>
          <p className="memory-pane__label">Seniority</p>
          <Segmented
            options={SENIORITY}
            value={value.seniority}
            onChange={(seniority) => onChange({ ...value, seniority })}
            ariaLabel="Seniority"
          />

          <p className="memory-pane__label">Work mode</p>
          <Segmented
            options={WORK_MODES}
            value={value.workMode}
            onChange={(workMode) => onChange({ ...value, workMode })}
            ariaLabel="Work mode"
          />

          <footer className="memory-card__footer">
            <Button variant="danger" onClick={onDelete}>
              Delete profile
            </Button>
            <Button variant="primary" onClick={onSave}>
              Save profile
            </Button>
          </footer>
        </div>
      </div>

      {saveNote ? <p className="memory-card__note">{saveNote}</p> : null}
    </section>
  );
}
