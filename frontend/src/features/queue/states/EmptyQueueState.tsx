import { EmptyState } from "../../../shared/ui/EmptyState";

/**
 * FigJam 05 empty queue. Allowed ingest only — never crawl deny-listed boards.
 */
export function EmptyQueueState() {
  return (
    <EmptyState
      kicker="Queue"
      title="Queue is empty"
      icon={<InboxIcon />}
    >
      <p>
        No sealed writer packets yet. Scout from the Arbeitsagentur Jobsuche
        API, an allowed RSS feed, or a listing you already opened and clipped
        into <code>_inbox/</code>.
      </p>
      <p>
        LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, and Glassdoor never
        enter through crawl or Apify.
      </p>
    </EmptyState>
  );
}

/** Decorative inbox glyph for the empty queue canvas. */
export function InboxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H7l-4 4V5Zm2 0v11.17L6.17 15H19V5H5Z"
      />
    </svg>
  );
}
