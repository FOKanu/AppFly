import { describe, expect, it } from "vitest";
import { JOB_STATUSES, STATUS_LABELS, statusLabel } from "./types";

describe("statusLabel", () => {
  it("has a human label for every status", () => {
    expect(STATUS_LABELS).toEqual({ inbox: "Inbox", shortlist: "Shortlist", draft: "Draft", approved: "Approved", applied: "Applied", skipped: "Skipped" });
    for (const status of JOB_STATUSES) expect(statusLabel(status)).toBe(STATUS_LABELS[status]);
  });
});
