import { useState, type KeyboardEvent } from "react";

interface TokenFieldProps {
  values: readonly string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel: string;
  /** Rendered instead of the input when the list is not editable. */
  readOnlyNote?: string;
  className?: string;
}

/**
 * Purpose: Editable list of removable chips — locations, languages, skills,
 *          banned terms, skip companies.
 * Does not: validate entries against crawl policy; policy.py owns that.
 */
export function TokenField({
  values,
  onChange,
  placeholder = "add…",
  ariaLabel,
  readOnlyNote,
  className,
}: TokenFieldProps) {
  const [draft, setDraft] = useState("");
  // A read-only field shows its note instead of an input, and its chips lose
  // their remove buttons — otherwise they would look clickable and do nothing.
  const readOnly = Boolean(readOnlyNote);
  const classes = ["token-field", readOnly ? "is-readonly" : "", className]
    .filter(Boolean)
    .join(" ");

  function commit() {
    const next = draft.trim();
    if (!next || values.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className={classes} role="group" aria-label={ariaLabel}>
      {values.map((value) => (
        <span key={value} className="token">
          {value}
          {readOnly ? null : (
            <button
              type="button"
              className="token__remove"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {readOnly ? (
        <span className="token-field__note">{readOnlyNote}</span>
      ) : (
        <input
          className="token-field__input"
          value={draft}
          placeholder={placeholder}
          aria-label={`Add to ${ariaLabel}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      )}
    </div>
  );
}
