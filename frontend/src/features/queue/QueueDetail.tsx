import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { Meter } from "../../shared/ui/Meter";
import { Score } from "../../shared/ui/Score";
import { Tag } from "../../shared/ui/Tag";
import { ROUTES } from "../../routes";
import { MatchScore } from "./MatchScore";
import { SourceBadge } from "./SourceBadge";
import { StatusChip } from "./StatusChip";
import type { JobRecord } from "./types";

type QueueDetailProps = {
  job: JobRecord | null;
  /** Position of this job inside the visible list, 1-based. */
  position: number;
  total: number;
  onApprove: (job: JobRecord) => void;
  onDeny: (job: JobRecord) => void;
  onStep: (delta: number) => void;
};

/** Tabs across the top of the detail pane. */
const TABS = ["Overview", "Letter", "Match breakdown", "Company", "Vault note"] as const;
type DetailTab = (typeof TABS)[number];

/**
 * Purpose: Detail pane for the selected queue job — one sealed packet, not the
 *          whole vault.
 * Does not: fetch the listing URL or render CV markdown.
 */
export function QueueDetail({
  job,
  position,
  total,
  onApprove,
  onDeny,
  onStep,
}: QueueDetailProps) {
  const [tab, setTab] = useState<DetailTab>("Overview");

  if (!job) {
    return (
      <aside className="queue-detail" data-testid="queue-detail">
        <p className="queue-detail__empty">Select a job to inspect it.</p>
      </aside>
    );
  }

  return (
    <aside className="queue-detail" data-testid="queue-detail">
      <header className="queue-detail__chips">
        <StatusChip status={job.status} />
        <SourceBadge source={job.source} />
        {job.lang ? <Tag>{job.lang.toUpperCase()}</Tag> : null}
        <Tag>ref {job.source_id}</Tag>
        <span className="queue-detail__rule" />
        <span className="queue-detail__position">
          {total > 0 ? `${position} of ${total}` : "—"}
        </span>
        <button
          type="button"
          className="queue-detail__step"
          aria-label="Previous job"
          onClick={() => onStep(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="queue-detail__step"
          aria-label="Next job"
          onClick={() => onStep(1)}
        >
          ↓
        </button>
      </header>

      <div className="queue-detail__title-row">
        <div>
          <h2 className="queue-detail__title">{job.title}</h2>
          <p className="queue-detail__sub">
            {[job.company, job.location, job.salary, job.posted].filter(Boolean).join(" · ") ||
              "—"}
          </p>
        </div>
        <div className="queue-detail__score">
          <Score value={toTen(job.score)} />
          <span className="queue-detail__score-label">Match / 10</span>
        </div>
      </div>

      <div className="queue-detail__actions">
        <Button variant="approve" shortcut="A" onClick={() => onApprove(job)}>
          Approve packet
        </Button>
        <Button variant="quiet" shortcut="D" onClick={() => onDeny(job)}>
          Deny
        </Button>
        <Link
          className="button button--quiet"
          to={`${ROUTES.packet}/${encodeURIComponent(job.source_id)}`}
        >
          <span className="button__label">Edit letter</span>
          <kbd className="button__kbd">E</kbd>
        </Link>
        <Link
          className="link-action"
          to={`${ROUTES.packet}/${encodeURIComponent(job.source_id)}`}
        >
          ↗ Open packet
        </Link>
        {job.url ? (
          <a className="link-action" href={job.url} target="_blank" rel="noreferrer noopener">
            ↗ Open official posting
          </a>
        ) : null}
      </div>

      <nav className="queue-detail__tabs" role="tablist" aria-label="Packet sections">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? "queue-tab is-active" : "queue-tab"}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      <div className="queue-detail__panels">
        {tab === "Overview" || tab === "Match breakdown" ? (
          <MatchPanel job={job} />
        ) : null}
        {tab === "Overview" || tab === "Letter" || tab === "Company" || tab === "Vault note" ? (
          <div className="queue-detail__col">
            {tab === "Overview" || tab === "Letter" ? (
              <section className="detail-card">
                <header className="detail-card__head">
                  <h3 className="detail-card__title">
                    {tab === "Letter" ? "Application letter" : "Job excerpt"}
                  </h3>
                  <Tag>{tab === "Letter" ? "draft" : `${job.lang || "—"} · original`}</Tag>
                </header>
                <p className="detail-card__body">
                  {(tab === "Letter" ? job.letter_excerpt : job.description) ||
                    "No excerpt stored for this listing."}
                </p>
              </section>
            ) : null}

            {tab === "Overview" || tab === "Company" ? (
              <section className="detail-card">
                <header className="detail-card__head">
                  <h3 className="detail-card__title">Company note</h3>
                  <Tag>Apify · Impressum only</Tag>
                </header>
                <p className="detail-card__body">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}. Public company page only — no
                  job-board session is ever used.
                </p>
                <p className="mono-path">Companies/{job.company}.md</p>
              </section>
            ) : null}

            {tab === "Vault note" ? (
              <section className="detail-card">
                <header className="detail-card__head">
                  <h3 className="detail-card__title">Vault note</h3>
                </header>
                <p className="mono-path">Jobs/{job.source_id}.md</p>
                <p className="detail-card__body">
                  The note on disk is the source of truth. Approving writes status there.
                </p>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      {!job.crawl_allowed ? (
        <p className="queue-detail__policy">
          crawl_allowed is false. Copilot will not fetch this listing. Open it yourself or clip
          it into _inbox/.
        </p>
      ) : null}

      <p className="queue-detail__note">
        You submit applications in your own browser. There is no Easy Apply bot.
      </p>
    </aside>
  );
}

function MatchPanel({ job }: { job: JobRecord }) {
  // The API does not break the score down yet; show the axes with the overall
  // score so the shape of the panel matches the design either way.
  const overall = toTen(job.score);
  const axes = [
    { label: "Skills overlap", value: overall },
    { label: "Domain", value: overall },
    { label: "Seniority", value: overall },
    { label: `Language (${job.lang || "—"})`, value: overall },
    { label: "Location", value: overall },
  ];

  return (
    <section className="detail-card">
      <header className="detail-card__head">
        <h3 className="detail-card__title">Why it matched</h3>
        <span className="detail-card__aside">
          <MatchScore score={job.score} />
        </span>
      </header>

      {axes.map((axis) => (
        <p className="match-row" key={axis.label}>
          <span className="match-row__label">{axis.label}</span>
          <Meter value={(axis.value ?? 0) / 10} label={axis.label} />
          <span className="match-row__value">
            {axis.value === null ? "—" : axis.value.toFixed(1)}
          </span>
        </p>
      ))}

      <p className="detail-card__label">Hard filters</p>
      <div className="hard-filters">
        <span className="hard-filter">✓ location</span>
        <span className="hard-filter">✓ no banned terms</span>
        <span className="hard-filter">✓ not on skip-list</span>
        <span className="hard-filter">✓ salary floor</span>
      </div>

      <p className="detail-card__label">Gaps</p>
      <p className="detail-card__body">No gap summary stored for this listing.</p>
    </section>
  );
}

/** Matcher scores arrive as a 0–1 cosine; the UI prints 0–10. */
function toTen(score: number | null): number | null {
  if (score == null) return null;
  return score <= 1 ? Math.round(score * 100) / 10 : score;
}
