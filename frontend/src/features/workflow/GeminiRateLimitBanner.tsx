/**
 * Purpose: Gemini 429 banner (preview fixture only; the real API never reports rate_limited).
 *          Run again starts a new full run through the shared run controller (spec H5).
 * Does not: post /runs itself, retry a single stage, or fetch anything from job boards.
 */
export function GeminiRateLimitBanner({
  onRunAgain,
  disabled,
  title,
}: {
  onRunAgain: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <div className="gemini-banner" role="status">
      <div>
        <p className="banner-title">Gemini rate-limited</p>
        <p className="muted">
          The last run hit Gemini's rate limit. Run again starts a new full run; nothing is fetched from job boards.
        </p>
      </div>
      <button type="button" className="retry-btn" onClick={onRunAgain} disabled={disabled} title={title || undefined}>
        Run again
      </button>
    </div>
  );
}
