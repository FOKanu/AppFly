import { sourceLabel } from "./filterJobs";

type SourceBadgeProps = {
  source: string;
};

/**
 * Purpose: Scout-channel stamp — Agentur API, Inbox, RSS, or Apify · Impressum only.
 * Does not: imply the listing was fetched; inbox clips are never crawled.
 */
export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span
      className={`source-badge source-badge--${source}`}
      data-testid="source-badge"
      data-source={source}
    >
      {sourceLabel(source)}
    </span>
  );
}
