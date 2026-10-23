/** Human text for a matcher skip_reason code (DESIGN.md §2 "Reason formatter"). */
export function skipReasonText(code: string): string {
  const i = code.indexOf(":");
  const kind = i === -1 ? code : code.slice(0, i);
  const arg = i === -1 ? "" : code.slice(i + 1);
  switch (kind) {
    case "skip_company":
      return `${arg} is on your skip list`;
    case "banned":
      return `mentions “${arg}”, a banned term`;
    case "missing":
      return `missing must-have terms: ${arg.split(",").join(", ")}`;
    case "location":
      return "location is outside your areas";
    case "salary":
      return `salary ${Number(arg).toLocaleString()} is below your floor`;
    default:
      return code;
  }
}

/** True when the matcher dropped this job at the hard filters. */
export function isFiltered(job: { status: string; skip_reason?: string | null }): boolean {
  return job.status === "skipped" && Boolean(job.skip_reason);
}
