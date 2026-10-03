import { Link } from "react-router-dom";
import { Meter } from "../../shared/ui/Meter";
import { Score } from "../../shared/ui/Score";
import { Tag } from "../../shared/ui/Tag";
import { ROUTES } from "../../routes";
import { SourceBadge } from "../queue/SourceBadge";
import { StatusChip } from "../queue/StatusChip";
import type { JobRecord } from "../queue/types";

interface PacketSpecProps {
  job: JobRecord;
}

/**
 * Purpose: Left pane of the packet — what the posting says, where it came from,
 *          and how it scored (one overall score; the API has no per-axis breakdown).
 * Does not: fetch the listing URL from the browser; the local scout does that,
 *           and only for allowed sources.
 */
export function PacketSpec({ job }: PacketSpecProps) {
  const score = toTen(job.score);

  return (
    <div className="packet-spec">
      <Link className="packet-spec__back" to={`${ROUTES.queue}/${encodeURIComponent(job.source_id)}`}>
        ← Back to queue <kbd className="kbd">Esc</kbd>
      </Link>

      <div className="packet-spec__chips">
        <StatusChip status={job.status} />
        <SourceBadge source={job.source} />
        {job.lang ? <Tag>{job.lang.toUpperCase()}</Tag> : null}
        <span className="packet-spec__rule" />
        <Score value={score} />
      </div>

      <h2 className="packet-spec__title">{job.title}</h2>
      <p className="packet-spec__sub">
        {[job.company, job.location].filter(Boolean).join(" · ") || "—"}
      </p>

      <div className="posting-card">
        <span
          className="posting-card__dot"
          data-allowed={job.crawl_allowed}
          aria-hidden="true"
        />
        <div className="posting-card__col">
          <p className="posting-card__title">Official posting · {hostOf(job.url)}</p>
          <p className="posting-card__meta">
            {job.crawl_allowed
              ? "allowed source \u00b7 ingested by the scout"
              : "stored from a clip · URL never fetched"}
          </p>
        </div>
        {job.url ? (
          <a
            className="button button--ghost"
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="button__icon" aria-hidden="true">
              ↗
            </span>
            <span className="button__label">Open listing</span>
          </a>
        ) : null}
      </div>

      <dl className="spec-table">
        <SpecRow label="Location" value={job.location} />
        <SpecRow label="Contract" value={undefined} />
        <SpecRow label="Salary" value={job.salary} />
        <SpecRow label="Language" value={job.lang ? job.lang.toUpperCase() : undefined} />
        <SpecRow label="Posted" value={job.posted} />
      </dl>

      <p className="packet-spec__label">Match score</p>
      <div className="match-row">
        <span className="match-row__label">Overall</span>
        <Meter value={(score ?? 0) / 10} label="Overall match" />
        <span className="match-row__value">{score === null ? "—" : score.toFixed(1)}</span>
      </div>

      <p className="packet-spec__label">Company note</p>
      <p className="packet-spec__copy">
        {job.company}. Public company / Impressum page only — no job-board session is used.
      </p>

      <p className="packet-spec__label">Requirements from posting</p>
      {job.description ? (
        <ul className="packet-spec__requirements">
          {job.description
            .split(/[.\n]/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 5)
            .map((line) => (
              <li key={line}>{line}</li>
            ))}
        </ul>
      ) : (
        <p className="packet-spec__copy">No requirements stored for this listing.</p>
      )}

      {job.crawl_allowed ? null : (
        <p className="packet-spec__policy" data-testid="crawl-denied">
          crawl_allowed is false, so AppFly never fetches this listing's host.
        </p>
      )}
    </div>
  );
}

function SpecRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | undefined;
  mono?: boolean;
}) {
  return (
    <div className="spec-table__row">
      <dt>{label}</dt>
      <dd className={mono ? "mono-path" : undefined}>{value || "—"}</dd>
    </div>
  );
}

/** Host of the stored posting URL — printed, never requested. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "—";
  }
}

function toTen(score: number | null): number | null {
  if (score == null) return null;
  return score <= 1 ? Math.round(score * 100) / 10 : score;
}
