import type { Job } from "./types";

/**
 * Jobs still queued behind Match (inbox / not yet scored).
 */
export function QueuedBehindMatch({ jobs }: { jobs: Job[] }) {
  return (
    <section className="panel queued" aria-labelledby="queued-title">
      <p className="panel-kicker">Behind Match</p>
      <h2 id="queued-title">Queued</h2>
      {jobs.length === 0 ? (
        <p className="muted">Nothing waiting on Match.</p>
      ) : (
        <ul className="queued-list">
          {jobs.map((job) => (
            <li key={job.source_id}>
              <span>{job.title}</span>
              <span className="muted">
                {job.company}
                {job.location ? ` · ${job.location}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
