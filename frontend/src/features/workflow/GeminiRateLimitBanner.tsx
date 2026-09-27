import { Banner } from "../../shared/ui/Banner";
import { Button } from "../../shared/ui/Button";

/**
 * Purpose: Gemini 429 banner (preview fixture only; the real API never reports rate_limited), built from the shared
 *          Banner (tone warning) and Button (variant quiet).
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
    <Banner tone="warning" title="Gemini rate-limited">
      <p>
        The last run hit Gemini's rate limit. Run again starts a new full run; nothing is fetched from job boards.
      </p>
      <Button variant="quiet" onClick={onRunAgain} disabled={disabled} title={title || undefined}>
        Run again
      </Button>
    </Banner>
  );
}
