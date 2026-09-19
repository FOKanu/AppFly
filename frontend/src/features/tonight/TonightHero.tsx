import { Button } from "../../shared/ui/Button";
import type { Run } from "./types";

interface TonightHeroProps {
  run: Run | null;
  draftCount: number;
  refusalCount: number;
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

function kicker(run: Run | null): string {
  if (!run) return "Tonight · no run recorded";
  const finished = run.finished_at ? clock(run.finished_at) : null;
  const shortId = run.id.slice(-5);
  if (run.status === "running") return `Tonight · run ${shortId} in flight`;
  return finished
    ? `Tonight · run ${shortId} finished ${finished}`
    : `Tonight · run ${shortId}`;
}

function lead(run: Run | null, refusalCount: number): string {
  if (!run) {
    return "No run in the vault yet. Scout, Match and Write are dark — this panel never crawls job boards.";
  }
  const parts = [
    `${run.scouted} scouted`,
    `${run.shortlisted} shortlisted`,
    `${run.written} letter${run.written === 1 ? "" : "s"} written`,
  ];
  if (refusalCount > 0) {
    parts.push(
      `${refusalCount} start URL${refusalCount === 1 ? "" : "s"} refused by crawl policy (never fetched)`,
    );
  }
  return `${parts.join(" · ")}.`;
}

function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
