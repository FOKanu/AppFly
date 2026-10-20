import { Banner } from "../../shared/ui/Banner";
import { Button } from "../../shared/ui/Button";
import { TokenField } from "../../shared/ui/TokenField";
import { REQUIREMENT_LIMITS, limitProblems, type RequirementsDraft } from "./requirementsApi";

interface RequirementsPanelProps {
  state: "loading" | "ready" | "error";
  storageBackend: string | null;
  value: RequirementsDraft;
  onChange: (next: RequirementsDraft) => void;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onRevert: () => void;
}

/**
 * Purpose: Requirements & guardrails — the matcher's filters, kept in
 *          Requirements.md in the vault.
 * Does not: enforce the crawl deny-list; that is separate and read-only.
 */
export function RequirementsPanel({
  state,
  storageBackend,
  value,
  onChange,
  dirty,
  saving,
  error,
  onSave,
  onRevert
}: RequirementsPanelProps) {
  if (state === "loading") {
    return (
      <section id="requirements" className="control-card control-card--tall" aria-labelledby="requirements-title">
        <p className="control-card__kicker">{storageBackend === "markdown" ? "Match · Requirements.md" : "Match · saved in the app"}</p>
        <h2 id="requirements-title" className="control-card__title">Requirements &amp; guardrails</h2>
        <p className="control-card__note">Loading requirements…</p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section id="requirements" className="control-card control-card--tall" aria-labelledby="requirements-title">
        <p className="control-card__kicker">{storageBackend === "markdown" ? "Match · Requirements.md" : "Match · saved in the app"}</p>
        <h2 id="requirements-title" className="control-card__title">Requirements &amp; guardrails</h2>
        <Banner tone="warning" title="Requirements not loaded">
          The local API did not answer, so requirements cannot be edited right now. Reload the page to try again.
        </Banner>
      </section>
    );
  }

  const problems = limitProblems(value);

  return (
    <section id="requirements" className="control-card control-card--tall" aria-labelledby="requirements-title">
      <p className="control-card__kicker">{storageBackend === "markdown" ? "Match · Requirements.md" : "Match · saved in the app"}</p>
      <h2 id="requirements-title" className="control-card__title">Requirements &amp; guardrails</h2>

      <p className="control-card__note">
        The matcher and writer read these on every run. Changes apply from the next run. Listings already filtered out stay skipped.
      </p>

      <p className="control-card__label" id="req-label-locations">Locations</p>
      <TokenField
        values={value.locations}
        onChange={(next) => onChange({ ...value, locations: next })}
        ariaLabel="Locations"
        describedBy="req-help-locations"
        maxItems={REQUIREMENT_LIMITS.locations}
        maxLength={REQUIREMENT_LIMITS.itemChars}
      />
      <p className="control-card__note" id="req-help-locations">
        A listing must mention one of these or have no location. Add “remote” to keep remote roles. Leave empty for any location.
      </p>

      <p className="control-card__label" id="req-label-must_have">Must-have terms</p>
      <TokenField
        values={value.must_have}
        onChange={(next) => onChange({ ...value, must_have: next })}
        ariaLabel="Must-have terms"
        describedBy="req-help-must_have"
        maxItems={REQUIREMENT_LIMITS.must_have}
        maxLength={REQUIREMENT_LIMITS.itemChars}
      />
      <p className="control-card__note" id="req-help-must_have">
        A listing missing any one of these is filtered out. Keep this list short.
      </p>

      <p className="control-card__label" id="req-label-nice_to_have">Nice-to-have terms</p>
      <TokenField
        values={value.nice_to_have}
        onChange={(next) => onChange({ ...value, nice_to_have: next })}
        ariaLabel="Nice-to-have terms"
        describedBy="req-help-nice_to_have"
        maxItems={REQUIREMENT_LIMITS.nice_to_have}
        maxLength={REQUIREMENT_LIMITS.itemChars}
      />
      <p className="control-card__note" id="req-help-nice_to_have">
        These raise the match score. They never filter a listing out.
      </p>

      <p className="control-card__label" id="req-label-banned_terms">Banned terms</p>
      <TokenField
        values={value.banned_terms}
        onChange={(next) => onChange({ ...value, banned_terms: next })}
        ariaLabel="Banned terms"
        describedBy="req-help-banned_terms"
        maxItems={REQUIREMENT_LIMITS.banned_terms}
        maxLength={REQUIREMENT_LIMITS.itemChars}
      />
      <p className="control-card__note" id="req-help-banned_terms">
        A listing that mentions any of these is filtered out.
      </p>

      <p className="control-card__label" id="req-label-skip_companies">Skip companies</p>
      <TokenField
        values={value.skip_companies}
        onChange={(next) => onChange({ ...value, skip_companies: next })}
        ariaLabel="Skip companies"
        describedBy="req-help-skip_companies"
        maxItems={REQUIREMENT_LIMITS.skip_companies}
        maxLength={REQUIREMENT_LIMITS.itemChars}
      />
      <p className="control-card__note" id="req-help-skip_companies">
        Exact company name, any capitalisation. These are dropped before matching.
      </p>

      <label className="control-card__label" htmlFor="req-salary">Salary floor (€ per year)</label>
      <input
        id="req-salary"
        type="number"
        min={0}
        max={1000000}
        step={1000}
        inputMode="numeric"
        value={value.salary_floor}
        aria-describedby="req-help-salary_floor"
        onChange={(e) => onChange({ ...value, salary_floor: Number(e.target.value) || 0 })}
      />
      <p className="control-card__note" id="req-help-salary_floor">
        Listings with a lower stated salary are filtered out. Listings without a salary are kept. 0 turns this off.
      </p>

      <p className="control-card__label" id="req-label-languages">Letter languages</p>
      <TokenField
        values={value.languages}
        onChange={(next) => onChange({ ...value, languages: next })}
        ariaLabel="Letter languages"
        describedBy="req-help-languages"
        maxItems={REQUIREMENT_LIMITS.languages}
        maxLength={REQUIREMENT_LIMITS.languageChars}
      />
      <p className="control-card__note" id="req-help-languages">
        Language codes such as de or en. The writer gets this list. At least one is required.
      </p>

      <label className="control-card__label" htmlFor="req-tone">Letter tone</label>
      <input
        id="req-tone"
        type="text"
        maxLength={200}
        placeholder="concise, specific, no buzzword salad"
        value={value.tone}
        aria-describedby="req-help-tone"
        onChange={(e) => onChange({ ...value, tone: e.target.value })}
      />
      <p className="control-card__note" id="req-help-tone">
        One line the writer follows for tone.
      </p>

      {problems.length > 0 ? (
        <ul>
          {problems.map((problem, i) => (
            <li key={i}>{problem}</li>
          ))}
        </ul>
      ) : null}

      <p className="control-card__note">
        {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
      </p>

      {error ? <p role="alert" className="control-card__note">{error}</p> : null}

      <Button onClick={onRevert} disabled={!dirty || saving}>
        Revert
      </Button>

      <Button variant="primary" onClick={onSave} disabled={!dirty || saving || problems.length > 0}>
        Save requirements
      </Button>
    </section>
  );
}
