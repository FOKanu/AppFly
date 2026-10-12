import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { Chip } from "../../shared/ui/Chip";
import { Score } from "../../shared/ui/Score";
import { StatusChip } from "../../shared/ui/StatusChip";
import { Tag } from "../../shared/ui/Tag";
import { ROUTES } from "../../routes";
import { toTenPointScale } from "./score";
import type { Job } from "./types";
import { useShortcuts } from "../../shared/useShortcuts";

interface NeedsYouProps {
  drafts: Job[];
  /** Job currently being written to the API, if any. */
  busyId: string | null;
  onApprove: (job: Job) => void;
  onDeny: (job: Job) => void;
}

/**
 * Purpose: The human-approval column — one expanded top draft plus a compact row
 *          per remaining draft.
 * Does not: submit anything. Approving marks the packet ready in the vault; the
 *           person still applies in their own browser.
 */
export function NeedsYou({ drafts, busyId, onApprove, onDeny }: NeedsYouProps) {
  const [top, ...rest] = drafts;

  return (
    <section className="needs-you" aria-labelledby="needs-you-title">
      <header className="needs-you__head">
        <h2 id="needs-you-title" className="needs-you__title">
          Needs you
        </h2>
        <Chip tone="warning" dot>
          {drafts.length} draft{drafts.length === 1 ? "" : "s"}
        </Chip>
        <span className="needs-you__rule" />
        <p className="needs-you__hints">A approve · D skip · E edit</p>
      </header>

      {top ? (
        <TopDraft
          draft={top}
          busy={busyId === top.source_id}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      ) : (
        <article className="top-draft top-draft--empty">
          <p className="t-title-sm">Nothing waiting for you</p>
          <p className="page__copy">
            No letters are in draft. The next nightly run writes into the vault; nothing
            is ever submitted for you.
          </p>
        </article>
      )}

      <ul className="other-drafts">
        {rest.map((job) => (
          <li key={job.source_id}>
            <Link className="other-drafts__row" to={`${ROUTES.packet}/${job.source_id}`}>
              <StatusChip status="draft" />
              <span className="other-drafts__col">
                <span className="other-drafts__title">{job.title}</span>
                <span className="other-drafts__meta">
                  {[job.company, job.location, job.source?.toUpperCase()]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <Score value={toTenPointScale(job.score)} size="sm" />
              <span className="other-drafts__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopDraft({
  draft,
  busy,
  onApprove,
  onDeny,
}: {
  draft: Job;
  busy: boolean;
  onApprove: (job: Job) => void;
  onDeny: (job: Job) => void;
}) {
  const navigate = useNavigate();
  useShortcuts({
    a: () => {
      if (!busy) onApprove(draft);
    },
    d: () => {
      if (!busy) onDeny(draft);
    },
    e: () => navigate(`${ROUTES.packet}/${draft.source_id}`),
  });

  return (
    <article className="top-draft">
      <header className="top-draft__head">
        <StatusChip status="draft" />
        <Tag>{sourceLabel(draft.source)}</Tag>
        <Tag>{draft.language ?? "—"}</Tag>
        <Tag>letter · {draft.writer ?? "—"}</Tag>
        <span className="top-draft__rule" />
        <span className="top-draft__match-label">match</span>
        <Score value={toTenPointScale(draft.score)} />
      </header>

      <h3 className="top-draft__title">{draft.title}</h3>
      <p className="top-draft__meta">
        {[draft.company, draft.location, draft.posted, draft.salary]
          .filter(Boolean)
          .join(" · ") || "—"}
      </p>

      <div className="top-draft__reasons">
        <div className="reason-box">
          <p className="reason-box__label">
            <span className="reason-box__dot" data-tone="ok" aria-hidden="true" />
            Why it matched
          </p>
          <p className="reason-box__body">{draft.whyMatched ?? "—"}</p>
        </div>
        <div className="reason-box">
          <p className="reason-box__label">
            <span className="reason-box__dot" data-tone="warning" aria-hidden="true" />
            Gaps
          </p>
          <p className="reason-box__body">{draft.gaps ?? "—"}</p>
        </div>
      </div>

      <footer className="top-draft__actions">
        <Button
          variant="approve"
          shortcut="A"
          disabled={busy}
          onClick={() => onApprove(draft)}
        >
          {busy ? "Saving…" : "Approve packet"}
        </Button>
        <Button variant="quiet" shortcut="D" disabled={busy} onClick={() => onDeny(draft)}>
          Skip
        </Button>
        <Link className="button button--quiet" to={`${ROUTES.packet}/${draft.source_id}`}>
          <span className="button__label">Edit letter</span>
          <kbd className="button__kbd">E</kbd>
        </Link>
        <span className="top-draft__rule" />
        {draft.url ? (
          <a
            className="link-action"
            href={draft.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            ↗ Open posting
          </a>
        ) : (
          <span className="link-action is-disabled" title="This job note has no posting URL.">
            ↗ Open posting
          </span>
        )}
      </footer>
    </article>
  );
}

/** Human label for the ingest channel, never a deny-listed board. */
function sourceLabel(source: string | undefined): string {
  switch (source) {
    case "api":
      return "Agentur API";
    case "rss":
      return "RSS";
    case "clips":
      return "_inbox clip";
    default:
      return source ?? "—";
  }
}
