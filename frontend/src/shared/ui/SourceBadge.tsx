/**
 * Purpose: Canonical allowed-source labels for list rows later.
 * Does not: include deny-listed job boards.
 */
export const SOURCE_BADGE_KINDS = [
  { id: "agentur", label: "Agentur API" },
  { id: "rss", label: "RSS" },
  { id: "inbox", label: "Inbox" },
  { id: "apify", label: "Apify · Impressum only" },
] as const;

export type SourceBadgeKind = (typeof SOURCE_BADGE_KINDS)[number]["id"];

interface SourceBadgeProps {
  kind: SourceBadgeKind;
}

/**
 * Purpose: Label an allowed ingest source (Agentur, RSS, Inbox, Apify/Impressum).
 * Does not: start crawls or imply LinkedIn/Indeed/Stepstone scraping is available.
 */
export function SourceBadge({ kind }: SourceBadgeProps) {
  const meta = SOURCE_BADGE_KINDS.find((item) => item.id === kind);
  if (!meta) return null;
  return <span className={`source-badge source-badge--${kind}`}>{meta.label}</span>;
}
