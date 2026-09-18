import { useState, type FormEvent } from "react";

export type ConnectorKeyFieldProps = {
  /** Environment-style name shown as the field label. */
  name: "GEMINI_API_KEY" | "APIFY_TOKEN";
  /** Backend configured flag only — never a secret or last-4. */
  configured: boolean;
  /**
   * Persist a new secret via PUT. The parent must not log `value` and must
   * not write it back into this field after success.
   */
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
};

/**
 * Write-only connector secret field.
 *
 * Never renders stored secrets: the input is a draft-only `type="password"`
 * box. GET /settings configured flags become a "configured" / "missing" badge
 * only — no last-4, no echoed payload, no defaultValue from the server.
 * After a successful save the draft is cleared. Rotate overwrites the same
 * PUT /settings/secrets/{name} `{ value }` contract.
 */
export function ConnectorKeyField({
  name,
  configured,
  onSave,
  disabled = false,
}: ConnectorKeyFieldProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `connector-${name}`;
  const statusId = `${inputId}-status`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft;
    if (!next.trim() || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(next);
      setDraft("");
    } catch {
      setError("Could not save key. It was not displayed and was not logged.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="connectorKeyField" onSubmit={handleSubmit} autoComplete="off">
      <div className="connectorKeyFieldHeader">
        <label htmlFor={inputId}>{name}</label>
        <span
          id={statusId}
          className={configured ? "statusPill statusPill--ok" : "statusPill statusPill--missing"}
          role="status"
        >
          {configured ? "configured" : "missing"}
        </span>
      </div>
      <div className="settingsActions">
        <input
          id={inputId}
          name={`draft-${name}`}
          type="password"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={configured ? "Enter a new key to rotate" : "Paste key, then save"}
          value={draft}
          disabled={disabled || busy}
          aria-describedby={statusId}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={disabled || busy || !draft.trim()}>
          {configured ? "Rotate" : "Save"}
        </button>
      </div>
      {error ? (
        <p className="settingsError" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
