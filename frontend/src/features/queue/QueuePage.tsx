import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { filterJobs, type QueueFilterState } from "./filterJobs";
import { listJobs } from "./jobsApi";
import { JobList } from "./JobList";
import { QueueDetail } from "./QueueDetail";
import { QueueFilters } from "./QueueFilters";
import { EmptyQueueState } from "./states/EmptyQueueState";
import type { JobRecord } from "./types";
import styles from "./QueuePage.module.css";

/**
 * Queue master-detail: filterable job list plus one selected job.
 * Loads GET /jobs and falls back to mocks when the API is down.
 */
export function QueuePage() {
  const { sourceId } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [usingMock, setUsingMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QueueFilterState>({ status: "all", source: "all" });

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
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load jobs");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const selected = visible.find((job) => job.source_id === sourceId) ?? visible[0] ?? null;

  function onSelect(id: string) {
    navigate(`/queue/${encodeURIComponent(id)}`);
  }

  return (
    <section className={styles.page} data-testid="queue-page">
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Jobhunt Copilot</p>
          <h1 className={styles.title}>Queue</h1>
        </div>
        <p className={styles.count}>
          {visible.length} of {jobs.length} jobs
        </p>
      </header>
      {usingMock ? (
        <p className={styles.banner} data-testid="mock-banner">
          Sample queue — GET /jobs is unavailable. Status changes stay local until the API is up.
        </p>
      ) : null}
      {error ? <p className={styles.banner}>{error}</p> : null}
      <QueueFilters value={filters} onChange={setFilters} />
      {jobs.length === 0 ? (
        <EmptyQueueState />
      ) : (
        <div className={styles.body}>
          <JobList jobs={visible} selectedId={selected?.source_id ?? null} onSelect={onSelect} />
          <QueueDetail job={selected} />
        </div>
      )}
    </section>
  );
}
