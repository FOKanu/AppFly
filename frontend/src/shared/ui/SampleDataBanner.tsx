import { Banner } from "./Banner";

export type SampleNoun = "jobs" | "runs" | "activity" | "ledger";

/**
 * Purpose: Shared F2 / M7 label when a screen shows offline sample fixtures.
 * Does not: Appear for HTTP errors while the API is up.
 */
export function SampleDataBanner({ noun }: { noun: SampleNoun }) {
  return (
    <div data-testid="mock-banner">
      <Banner tone="warning" title="Sample data">
        The local API isn&apos;t reachable, so this screen shows sample {noun}, not yours. Start
        the API (python -m jobhunt.api) and refresh.
      </Banner>
    </div>
  );
}
