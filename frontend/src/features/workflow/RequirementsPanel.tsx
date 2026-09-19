import { Button } from "../../shared/ui/Button";
import { Segmented } from "../../shared/ui/Segmented";
import { TokenField } from "../../shared/ui/TokenField";

/** Tone the writer uses for letters. */
export type LetterTone = "direct" | "warm" | "formal";

const TONES = [
  { value: "direct", label: "Direct" },
  { value: "warm", label: "Warm" },
  { value: "formal", label: "Formal (Sie)" },
] as const;

/** Everything Requirements.md holds, as the matcher reads it. */
export interface Guardrails {
  locations: string[];
  languages: string[];
  requiredSkills: string[];
  bannedTerms: string[];
  skipCompanies: string[];
  tone: LetterTone;
}

interface RequirementsPanelProps {
  value: Guardrails;
  onChange: (next: Guardrails) => void;
  unsavedCount: number;
  onDiscard: () => void;
  onSave: () => void;
  /** Shown when the control-plane write endpoint is not available. */
  saveNote?: string;
}

/**
 * Purpose: Requirements & guardrails — the matcher's filters, kept in
 *          Requirements.md in the vault.
 * Does not: enforce the crawl deny-list; that is separate and read-only.
 */
export function RequirementsPanel({
  value,
  onChange,
  unsavedCount,
  onDiscard,
  onSave,
  saveNote,
}: RequirementsPanelProps) {
  return (
    <section className="control-card control-card--tall" aria-labelledby="requirements-title">
      <p className="control-card__kicker">Match · Requirements.md</p>
      <h2 id="requirements-title" className="control-card__title">
        Requirements &amp; guardrails
      </h2>

      <p className="control-card__label">Locations</p>
      <TokenField
        values={value.locations}
        onChange={(locations) => onChange({ ...value, locations })}
        ariaLabel="Locations"
      />

      <p className="control-card__label">Languages</p>
      <TokenField
        values={value.languages}
        onChange={(languages) => onChange({ ...value, languages })}
        ariaLabel="Languages"
      />

      <p className="control-card__label">Required skills</p>
      <TokenField
        values={value.requiredSkills}
        onChange={(requiredSkills) => onChange({ ...value, requiredSkills })}
        ariaLabel="Required skills"
      />

      <p className="control-card__label">Banned terms</p>
      <TokenField
        values={value.bannedTerms}
        onChange={(bannedTerms) => onChange({ ...value, bannedTerms })}
        ariaLabel="Banned terms"
      />

      <p className="control-card__label">Skip companies</p>
      <TokenField
        values={value.skipCompanies}
        onChange={(skipCompanies) => onChange({ ...value, skipCompanies })}
        ariaLabel="Skip companies"
        readOnlyNote="synced with Memory"
      />

      <p className="control-card__label">Letter tone</p>
      <Segmented
        options={TONES}
        value={value.tone}
        onChange={(tone) => onChange({ ...value, tone })}
        ariaLabel="Letter tone"
      />

      <footer className="control-card__footer">
        <span className="control-card__unsaved">
          {unsavedCount > 0 ? `${unsavedCount} unsaved changes` : "No unsaved changes"}
        </span>
        <Button variant="ghost" onClick={onDiscard} disabled={unsavedCount === 0}>
          Discard
        </Button>
        <Button variant="primary" onClick={onSave} disabled={unsavedCount === 0}>
          Save requirements
        </Button>
      </footer>
      {saveNote ? <p className="control-card__note">{saveNote}</p> : null}
    </section>
  );
}
