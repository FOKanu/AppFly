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
import { JOB_STATUSES, statusLabel, type JobRecord, type JobStatus } from "./types";
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
    async (job: JobRecord, status: JobStatus, bulk = false): Promise<string | null> => {
      if (!bulk) setSaveError(null);
      const previous = job.status;
      setJobs((current) =>
        current.map((row) => (row.source_id === job.source_id ? { ...row, status } : row)),
      );
      if (!bulk) setUndo({ status, changes: [{ sourceId: job.source_id, title: job.title, previous }] });
      try {
        await patchJobStatus(job.source_id, status);
        return null;
      } catch (err: unknown) {
        setJobs((current) =>
          current.map((row) =>
            row.source_id === job.source_id && row.status === status ? { ...row, status: previous } : row,
          ),
        );
        const reason = asFailure(err)?.message || "unknown error";
        if (!bulk) {
          setUndo(null);
          setSaveError(`Could not move ${job.title} to ${statusLabel(status)}. ${reason}`);
        }
        return reason;
      }
    },
    [],
  );

  const onUndo = useCallback(async () => {
    if (!undo) return;
    setSaveError(null);
    setUndo(null);
    const { status, changes } = undo;
    const previousOf = new Map(changes.map((change) => [change.sourceId, change.previous]));
    setJobs((current) =>
      current.map((row) => (previousOf.has(row.source_id) ? { ...row, status: previousOf.get(row.source_id) as JobStatus } : row)),
    );
    const results = await Promise.all(
      changes.map(async (change) => {
        try {
          await patchJobStatus(change.sourceId, change.previous);
          return null;
        } catch (err: unknown) {
          setJobs((current) =>
            current.map((row) =>
              row.source_id === change.sourceId && row.status === change.previous ? { ...row, status } : row,
            ),
          );
          return asFailure(err)?.message || "unknown error";
        }
      }),
    );
    const failed = results.filter((message): message is string => Boolean(message));
    if (failed.length === 0) return;
    if (changes.length === 1) {
      setSaveError(`Could not undo ${changes[0].title}. ${failed[0]}`);
    } else {
      setSaveError(`Could not undo ${failed.length} of ${changes.length} jobs. First error: ${failed[0]}`);
    }
  }, [undo]);

  const onBulk = useCallback(
    async (status: JobStatus) => {
      const rows = jobs.filter((job) => checkedIds.has(job.source_id));
      setCheckedIds(new Set());
      setSaveError(null);
      const results = await Promise.all(rows.map((job) => setStatus(job, status, true)));
      const failed = results.filter((message): message is string => Boolean(message));
      if (failed.length > 0) {
        const noun = rows.length === 1 ? "job" : "jobs";
        setSaveError(`Could not move ${failed.length} of ${rows.length} ${noun} to ${statusLabel(status)}. First error: ${failed[0]}`);
      }
      const moved = rows.filter((_job, index) => results[index] === null);
      if (moved.length > 0) {
        setUndo({
          status,
          changes: moved.map((job) => ({ sourceId: job.source_id, title: job.title, previous: job.status })),
        });
      }
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
            onApproveChecked={() => void onBulk("approved")}
            onSkipChecked={() => void onBulk("skipped")}
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
