import { EmptyState } from "../../../shared/ui/EmptyState";

/**
 * FigJam 05 Gemini rate-limit. Writer packets stay sealed; do not scrape extras.
 */
export function GeminiRateLimitedState() {
  return (
    <EmptyState kicker="Writer" title="Gemini is rate-limited" icon={<SparkIcon />}>
      <p>
        Cover letters were not written. Each packet stays sealed (one job + CV slice + voice
        samples). Wait, then retry write on the local API.
      </p>
      <p>
        Do not raise the letter cap to bypass the model, and do not paste job-board sessions into
        this UI.
      </p>
    </EmptyState>
  );
}

/** Decorative spark glyph for the writer rate-limit canvas. */
export function SparkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z"
      />
    </svg>
  );
}
