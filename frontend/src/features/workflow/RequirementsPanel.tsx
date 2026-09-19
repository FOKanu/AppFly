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
  /** Why none of this is editable here. */
  readOnlyReason: string;
}

/**
 * Purpose: Requirements & guardrails — the matcher's filters, kept in
 *          Requirements.md in the vault.
 * Does not: enforce the crawl deny-list; that is separate and read-only.
 */
export function RequirementsPanel({ value, readOnlyReason }: RequirementsPanelProps) {
  return (
    <section className="control-card control-card--tall" aria-labelledby="requirements-title">
      <p className="control-card__kicker">Match · Requirements.md</p>
      <h2 id="requirements-title" className="control-card__title">
        Requirements &amp; guardrails
      </h2>

      <p className="control-card__label">Locations</p>
      <TokenField
        values={value.locations}
        onChange={() => undefined}
        ariaLabel="Locations"
        readOnlyNote={readOnlyReason}
      />

      <p className="control-card__label">Languages</p>
      <TokenField
        values={value.languages}
        onChange={() => undefined}
        ariaLabel="Languages"
        readOnlyNote={readOnlyReason}
      />

      <p className="control-card__label">Required skills</p>
      <TokenField
        values={value.requiredSkills}
        onChange={() => undefined}
        ariaLabel="Required skills"
        readOnlyNote={readOnlyReason}
      />

      <p className="control-card__label">Banned terms</p>
      <TokenField
        values={value.bannedTerms}
        onChange={() => undefined}
        ariaLabel="Banned terms"
        readOnlyNote={readOnlyReason}
      />

      <p className="control-card__label">Skip companies</p>
      <TokenField
        values={value.skipCompanies}
        onChange={() => undefined}
        ariaLabel="Skip companies"
        readOnlyNote={readOnlyReason}
      />

      <p className="control-card__label">Letter tone</p>
      <Segmented
        options={TONES}
        value={value.tone}
        onChange={() => undefined}
        ariaLabel="Letter tone"
        disabled
        disabledReason={readOnlyReason}
      />

      <p className="control-card__note">{readOnlyReason}</p>
    </section>
  );
}
