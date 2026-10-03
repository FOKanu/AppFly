import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ApiFailure } from "../../shared/api/errors";
import { Banner } from "../../shared/ui/Banner";
import { SampleDataBanner } from "../../shared/ui/SampleDataBanner";
import { EMPTY_FILTERS, filterJobs, type QueueFilterState } from "./filterJobs";
import { listJobs, patchJobStatus } from "./jobsApi";
import { JobList } from "./JobList";
import { KanbanBoard } from "./KanbanBoard";
import { QueueDetail } from "./QueueDetail";
import { QueueToolbar, type QueueSort, type QueueView } from "./QueueToolbar";
import { UndoToast, type UndoEntry } from "./UndoToast";
import { EmptyQueueState } from "./states/EmptyQueueState";
import { JOB_STATUSES, type JobRecord, type JobStatus } from "./types";
import "./queue.css";

function asFailure(err: unknown): ApiFailure | null {
  if (err && typeof err === "object" && "kind" in err && "message" in err) {
    return err as ApiFailure;
  }
  return null;
}

/**
 * Purpose: Queue master-detail — filterable job list plus one selected packet.
 * Does not: submit applications or fetch listing HTML from the browser.
 */
export function QueuePage() {
  const { sourceId } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<QueueFilterState>(EMPTY_FILTERS);
  const [view, setView] = useState<QueueView>("list");
  const [sort, setSort] = useState<QueueSort>("score");
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());
  const [undo, setUndo] = useState<UndoEntry | null>(null);

  // Tonight links here with ?status=draft and the header search with ?q=.
  useEffect(() => {
    const status = searchParams.get("status");
    const query = searchParams.get("q");
    setFilters((current) => ({
      ...current,
      status: isStatus(status) ? status : current.status,
      query: query ?? current.query,
    }));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    listJobs()
      .then((result) => {
        if (cancelled) return;
        setJobs(result.jobs);
        setUsingMock(result.usingMock);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const failure = asFailure(err);
        setError(failure?.message ?? (err instanceof Error ? err.message : "Failed to load jobs"));
        setUsingMock(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const rows = filterJobs(jobs, filters);
    return [...rows].sort((a, b) =>
      sort === "score" ? (b.score ?? 0) - (a.score ?? 0) : a.posted.localeCompare(b.posted),
    );
  }, [jobs, filters, sort]);

  const counts = useMemo(() => countByStatus(jobs), [jobs]);
  const selectedIndex = Math.max(
    0,
    visible.findIndex((job) => job.source_id === sourceId),
  );
  const selected = visible[selectedIndex] ?? null;

  const onSelect = useCallback(
    (id: string) => {
      navigate(`/queue/${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const onStep = useCallback(
    (delta: number) => {
      const next = visible[selectedIndex + delta];
      if (next) onSelect(next.source_id);
    },
    [visible, selectedIndex, onSelect],
  );

  const onToggleChecked = useCallback((id: string) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setStatus = useCallback(
    async (job: JobRecord, status: JobStatus) => {
      setSaveError(null);
      const previous = job.status;
      setJobs((current) =>
        current.map((row) => (row.source_id === job.source_id ? { ...row, status } : row)),
      );
      setUndo({ title: job.title, status, sourceId: job.source_id, previous });
      try {
        await patchJobStatus(job.source_id, status);
      } catch (err: unknown) {
        setJobs((current) =>
          current.map((row) =>
            row.source_id === job.source_id && row.status === status ? { ...row, status: previous } : row,
          ),
        );
        setUndo(null);
        const failure = asFailure(err);
        setSaveError(`Could not save ${job.title} as ${status}. ${failure?.message ?? ""}`.trim());
      }
    },
    [],
  );

  const onUndo = useCallback(async () => {
    if (!undo) return;
    const job = jobs.find((row) => row.source_id === undo.sourceId);
    setSaveError(null);
    setUndo(null);
    if (!job) return;
    setJobs((current) =>
      current.map((row) =>
        row.source_id === undo.sourceId ? { ...row, status: undo.previous } : row,
      ),
    );
    try {
      await patchJobStatus(undo.sourceId, undo.previous);
    } catch (err: unknown) {
      setJobs((current) =>
        current.map((row) =>
          row.source_id === undo.sourceId && row.status === undo.previous ? { ...row, status: undo.status } : row,
        ),
      );
      setSaveError(`Could not undo ${job.title}. ${asFailure(err)?.message ?? ""}`.trim());
    }
  }, [undo, jobs]);

  const onBulk = useCallback(
    (status: JobStatus) => {
      jobs
        .filter((job) => checkedIds.has(job.source_id))
        .forEach((job) => void setStatus(job, status));
      setCheckedIds(new Set());
    },
    [jobs, checkedIds, setStatus],
  );

  return (
    <section className="queue-page page-flush" data-testid="queue-page">
      {usingMock ? <SampleDataBanner noun="jobs" /> : null}
      {error ? (
        <Banner tone="danger" title="Couldn't load Queue" role="alert">
          {error}
        </Banner>
      ) : null}

      {saveError ? (
        <Banner tone="danger" title="Couldn't save" role="alert">
          {saveError}
        </Banner>
      ) : null}

      <QueueToolbar
        filters={filters}
        onFilters={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        counts={counts}
        view={view}
        onView={setView}
        sort={sort}
        onSort={setSort}
        profileName="Senior PM — Berlin"
      />

      {/*
        The panes always render, even with an empty vault, so the layout matches
        the design and every field has a visible home.
      */}
      {view === "kanban" ? (
        <KanbanBoard
          jobs={visible}
          selectedId={selected?.source_id ?? null}
          onSelect={onSelect}
          onMove={(job, status) => void setStatus(job, status)}
        />
      ) : (
      <div className="queue-page__panes">
        {jobs.length === 0 ? (
          <div className="job-list job-list--empty">
            <EmptyQueueState />
          </div>
        ) : (
          <JobList
            jobs={visible}
            selectedId={selected?.source_id ?? null}
            onSelect={onSelect}
            checkedIds={checkedIds}
            onToggleChecked={onToggleChecked}
            onClearChecked={() => setCheckedIds(new Set())}
            onApproveChecked={() => onBulk("approved")}
            onSkipChecked={() => onBulk("skipped")}
          />
        )}
        <QueueDetail
          job={selected}
          position={selectedIndex + 1}
          total={visible.length}
          onApprove={(job) => void setStatus(job, "approved")}
          onDeny={(job) => void setStatus(job, "skipped")}
          onStep={onStep}
        />
      </div>
      )}

      <UndoToast entry={undo} onUndo={onUndo} onDismiss={() => setUndo(null)} />
    </section>
  );
}

/** Narrow a URL parameter to a real job status. */
function isStatus(value: string | null): value is JobStatus {
  return value !== null && (JOB_STATUSES as readonly string[]).includes(value);
}

/** Row count per status plus the all-bucket, for the toolbar tabs. */
function countByStatus(jobs: JobRecord[]): Record<JobStatus | "all", number> {
  const counts = { all: jobs.length } as Record<JobStatus | "all", number>;
  for (const status of JOB_STATUSES) {
    counts[status] = jobs.filter((job) => job.status === status).length;
  }
  return counts;
}
