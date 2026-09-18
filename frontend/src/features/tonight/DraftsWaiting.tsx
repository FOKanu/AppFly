import type { Job } from "./types";

/**
 * Cover-letter drafts waiting for human approval (never auto-submit).
 */
export function DraftsWaiting({ drafts }: { drafts: Job[] }) {
  return (
    <section className="panel drafts-waiting" aria-labelledby="drafts-title">
      <p className="panel-kicker">Waiting for you</p>
      <h2 id="drafts-title">Drafts</h2>
      {drafts.length === 0 ? (
        <p className="muted">No letters in draft. Writer is idle.</p>
      ) : (
        <ol className="draft-list">
          {drafts.map((job) => (
            <li key={job.source_id}>
              <span className="draft-title">{job.title}</span>
              <span className="draft-meta">
                {job.company}
                {job.location ? ` · ${job.location}` : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
