import type { JobCounts } from "./types";
import { JOB_STATUSES } from "./types";

type VaultStatsProps = {
  vaultPath: string;
  jobCounts: JobCounts;
};

/**
 * Purpose: Show vault path and job-note counts by status.
 * Does not: list job descriptions or open deny-listed boards.
 */
export function VaultStats({ vaultPath, jobCounts }: VaultStatsProps) {
  const total = JOB_STATUSES.reduce((sum, status) => sum + jobCounts[status], 0);
  return (
    <section aria-label="Vault statistics">
      <dl className="stats">
        <div className="stat stat-path">
          <dt>Vault</dt>
          <dd>{vaultPath}</dd>
        </div>
        <div className="stat">
          <dt>Job notes</dt>
          <dd>{total}</dd>
        </div>
        {JOB_STATUSES.map((status) => (
          <div className="stat" key={status}>
            <dt>{status}</dt>
            <dd>{jobCounts[status]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
