import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filterJobs, formatScore, sourceLabel } from "./filterJobs";
import { MOCK_JOBS } from "./mockJobs";

describe("filterJobs", () => {
  it("filters by status and source", () => {
    const skipped = filterJobs(MOCK_JOBS, { ...EMPTY_FILTERS, status: "skipped", source: "all" });
    expect(skipped).toHaveLength(1);
    expect(skipped[0].source).toBe("inbox");

    const agentur = filterJobs(MOCK_JOBS, { ...EMPTY_FILTERS, status: "all", source: "agentur" });
    expect(agentur.every((job) => job.source === "agentur")).toBe(true);
  });

  it("labels sources for FigJam badges", () => {
    expect(sourceLabel("agentur")).toBe("Agentur API");
    expect(sourceLabel("inbox")).toBe("Inbox");
    expect(sourceLabel("rss")).toBe("RSS");
    expect(sourceLabel("apify")).toBe("Apify · Impressum only");
  });

  it("formats match scores", () => {
    expect(formatScore(0.86)).toBe("86");
    expect(formatScore(null)).toBe("—");
  });
});
