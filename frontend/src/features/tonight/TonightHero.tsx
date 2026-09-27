import { Button } from "../../shared/ui/Button";
import { id5 } from "../../shared/run/format";
import type { Run } from "./types";

interface TonightHeroProps {
  run: Run | null;
  draftCount: number;
  /** Real crawl refusals, or null when the run does not report them (D6). */
  refusalCount: number | null;
  onOpenHome: () => void;
  onReviewDrafts: () => void;
}

/**
 * Purpose: Tonight's headline — what the pipeline did and what it needs from you.
 * Does not: run the pipeline; the control header owns Run now.
 */
export function TonightHero({
  run,
  draftCount,
  refusalCount,
  onOpenHome,
  onReviewDrafts,
}: TonightHeroProps) {
  return (
    <header className="tonight-hero">
      <div className="tonight-hero__col">
        <p className="tonight-hero__kicker">{kicker(run)}</p>
        <h2 className="tonight-hero__title">
          {draftCount > 0
            ? `${draftCount} draft${draftCount === 1 ? "" : "s"} ${draftCount === 1 ? "is" : "are"} waiting for you`
            : "Nothing is waiting for you"}
        </h2>
        <p className="tonight-hero__lead">{lead(run, refusalCount)}</p>
      </div>

      <div className="tonight-hero__actions">
        <Button variant="ghost" icon="↗" onClick={onOpenHome}>
          Open Home.md
        </Button>
        <Button variant="primary" shortcut="G Q" onClick={onReviewDrafts}>
          Review drafts
        </Button>
      </div>
    </header>
  );
}

/** D1/D8: `Tonight \u00b7 run #{id5} ...`; a live run reads `in flight` or `lost contact`. */
function kicker(run: Run | null): string {
  if (!run) return "Tonight \u00b7 no run recorded";
  const shortId = run.id ? ` #${id5(run.id)}` : "";
  if (run.status === "lost-contact") return `Tonight \u00b7 run${shortId} \u00b7 lost contact`;
  if (run.status === "stopping") return `Tonight \u00b7 run${shortId} stopping`;
  if (isActive(run)) return `Tonight \u00b7 run${shortId} in flight`;
  const finished = run.finished_at ? clock(run.finished_at) : null;
  return finished
    ? `Tonight \u00b7 run${shortId} finished ${finished}`
    : `Tonight \u00b7 run${shortId}`;
}

/** D1/D6: counts with a dash when unknown; `so far` and no refusal clause while active. */
function lead(run: Run | null, refusalCount: number | null): string {
  if (!run) {
    return "No run in the vault yet. Scout, Match and Write are dark \u2014 this panel never crawls job boards.";
  }
  const parts = [
    `${count(run.scouted)} scouted`,
    `${count(run.shortlisted)} shortlisted`,
    `${count(run.written)} letter${run.written === 1 ? "" : "s"} written`,
  ];
  if (isActive(run)) return `${parts.join(" \u00b7 ")} so far.`;
  if (refusalCount !== null && refusalCount > 0) {
    parts.push(
      `${refusalCount} start URL${refusalCount === 1 ? "" : "s"} refused by crawl policy (never fetched)`,
    );
  }
  return `${parts.join(" \u00b7 ")}.`;
}

/** A run still going: the live run (running, stopping, lost contact), or a loaded queued/running row (G3). */
function isActive(run: Run): boolean {
  return (
    run.status === "queued" ||
    run.status === "running" ||
    run.status === "stopping" ||
    run.status === "lost-contact"
  );
}

function count(value: number | undefined): string {
  return value === undefined ? "\u2014" : String(value);
}

function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
