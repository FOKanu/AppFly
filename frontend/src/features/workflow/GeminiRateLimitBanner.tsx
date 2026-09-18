/**
 * Gemini 429 banner. Retry calls the local write API only — never scrapes.
 */
export function GeminiRateLimitBanner({
  onRetry,
  busy,
  message,
}: {
  onRetry: () => void;
  busy: boolean;
  message: string | null;
}) {
  return (
    <div className="gemini-banner" role="status">
      <div>
        <p className="banner-title">Gemini rate-limited</p>
        <p className="muted">
          Writer paused at the API. Retry Gemini talks to the copilot only — no job-board fetch.
        </p>
        {message ? <p className="banner-msg">{message}</p> : null}
      </div>
      <button type="button" className="retry-btn" onClick={onRetry} disabled={busy}>
        {busy ? "Retrying…" : "Retry Gemini"}
      </button>
    </div>
  );
}
