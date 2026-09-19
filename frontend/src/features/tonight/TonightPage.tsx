import { useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { LastRunSummary } from "./LastRunSummary";
import { NeedsYou } from "./NeedsYou";
import { PipelineOrganism } from "./PipelineOrganism";
import { TonightHero } from "./TonightHero";
import { readPreview, useTonight } from "./useTonight";
import type { Job } from "./types";
import "./tonight.css";

/**
 * Purpose: Tonight — what the pipeline did last night and what needs a human.
 * Does not: submit applications, crawl job boards, or render CV markdown.
 */
export function TonightPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const preview = readPreview(search);
  const { snapshot, loading } = useTonight();

  useEffect(() => {
    document.title = "AppFly · Tonight";
  }, []);

  const run = preview === "empty" ? null : (snapshot?.lastRun ?? null);
  const drafts = preview === "empty" ? [] : (snapshot?.drafts ?? []);
  const refusals = run?.errors ?? [];

  const onReviewDrafts = useCallback(() => {
    navigate(`${ROUTES.queue}?status=draft`);
  }, [navigate]);

  const onOpenHome = useCallback(() => {
    // Home.md lives in the vault on this machine; the shell has no file dialog yet.
    navigate(ROUTES.memory);
  }, [navigate]);

  const onApprove = useCallback((job: Job) => {
    navigate(`${ROUTES.packet}/${job.source_id}`);
  }, [navigate]);

  const onDeny = useCallback((job: Job) => {
    navigate(`${ROUTES.packet}/${job.source_id}`);
  }, [navigate]);

  return (
    <div className="tonight" aria-busy={loading || undefined}>
      {preview ? <PreviewStrip active={preview} /> : null}

      <TonightHero
        run={run}
        draftCount={drafts.length}
        refusalCount={refusals.length}
        onOpenHome={onOpenHome}
        onReviewDrafts={onReviewDrafts}
      />

      <PipelineOrganism run={run} vaultNotes={snapshot?.shortlist.length} />

      <div className="tonight__lower">
        <NeedsYou drafts={drafts} onApprove={onApprove} onDeny={onDeny} />
        <LastRunSummary
          run={run}
          funnel={{
            scouted: run?.scouted,
            shortlisted: run?.shortlisted,
            approved: undefined,
            applied: undefined,
          }}
          writer={{ mode: "auto" }}
          refusals={refusals}
        />
      </div>
    </div>
  );
}

/**
 * Purpose: Reach the landed empty / running / failed review states from a URL.
 * Does not: show in the default view — the Figma frames have no preview strip.
 */
function PreviewStrip({ active }: { active: string }) {
  return (
    <p className="tonight__preview">
      <span className="t-label">Preview state</span>
      <Link to={ROUTES.tonight}>live</Link>
      <Link to="/tonight?preview=empty" aria-current={active === "empty" ? "page" : undefined}>
        empty
      </Link>
      <Link
        to="/tonight?preview=running"
        aria-current={active === "running" ? "page" : undefined}
      >
        running
      </Link>
      <Link
        to="/tonight?preview=failed"
        aria-current={active === "failed" ? "page" : undefined}
      >
        failed
      </Link>
    </p>
  );
}
