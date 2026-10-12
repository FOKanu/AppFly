import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as jobsApi from "./jobsApi";
import { getJob, listJobs, patchJobStatus, resetMockJobs, normalizeJob } from "./jobsApi";

describe("jobsApi", () => {
  beforeEach(() => {
    resetMockJobs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to the sample queue when GET /jobs is offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await listJobs();
    expect(result.usingMock).toBe(true);
    expect(result.jobs.length).toBeGreaterThan(0);
    expect(result.jobs.map((job) => job.status).sort()).toContain("draft");
  });

  it("does not use samples when GET /jobs returns HTTP 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: "boom" }),
        text: async () => "boom",
      }),
    );
    await expect(listJobs()).rejects.toMatchObject({ kind: "server" });
  });

  it("loads GET /jobs when the API responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ source_id: "live-1", title: "Live role", company: "Acme", status: "inbox" }],
      }),
    );
    const result = await listJobs();
    expect(result.usingMock).toBe(false);
    expect(result.jobs).toEqual([
      expect.objectContaining({ source_id: "live-1", title: "Live role", status: "inbox" }),
    ]);
  });

  it("PATCH /jobs/{id} sends only { status } and never API keys", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ source_id: "live-1", status: "approved", title: "Live role", company: "Acme" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await patchJobStatus("live-1", "approved");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/jobs/live-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ status: "approved" });
    const headers = JSON.stringify(init.headers ?? {});
    expect(headers.toLowerCase()).not.toMatch(/api[_-]?key|authorization|gemini|apify/);
  });

  it("getJob returns a single mock job when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await getJob("agentur-ref-88112");
    expect(result.job.title).toBe("Staff Platform Engineer");
    expect(result.job.source_id).toBe("agentur-ref-88112");
  });

  it("no code path calls /jobs/{id}/fetch", async () => {
    expect("requestListingFetch" in jobsApi).toBe(false);
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    await listJobs();
    await getJob("agentur-ref-88112");
    await patchJobStatus("agentur-ref-88112", "approved");
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => /\/jobs\/[^/]+\/fetch/.test(url))).toBe(false);
    expect(urls.join(" ")).not.toMatch(/linkedin|indeed|stepstone|ziprecruiter/i);
  });

  it("normalizeJob handles skip_reason and legacy skipped zero score", () => {
    // Test skip_reason mapping
    const jobWithSkipReason = normalizeJob({
      source_id: "test-1",
      title: "Test Job",
      status: "skipped",
      score: 0.42,
      skip_reason: "salary below threshold"
    });
    expect(jobWithSkipReason.skip_reason).toBe("salary below threshold");

    // Test missing skip_reason defaults to null
    const jobWithoutSkipReason = normalizeJob({
      source_id: "test-2",
      title: "Test Job",
      status: "skipped",
      score: 0.42
    });
    expect(jobWithoutSkipReason.skip_reason).toBeNull();

    // Test non-string skip_reason defaults to null
    const jobWithNonStringSkipReason = normalizeJob({
      source_id: "test-3",
      title: "Test Job",
      status: "skipped",
      score: 0.42,
      skip_reason: 123
    });
    expect(jobWithNonStringSkipReason.skip_reason).toBeNull();

    // Test legacy rule: skipped + score 0 -> null
    const jobSkippedZero = normalizeJob({
      source_id: "test-4",
      title: "Test Job",
      status: "skipped",
      score: 0
    });
    expect(jobSkippedZero.score).toBeNull();

    // Test skipped + non-zero score stays unchanged
    const jobSkippedNonZero = normalizeJob({
      source_id: "test-5",
      title: "Test Job",
      status: "skipped",
      score: 0.42
    });
    expect(jobSkippedNonZero.score).toBe(0.42);

    // Test inbox + score 0 stays unchanged
    const jobInboxZero = normalizeJob({
      source_id: "test-6",
      title: "Test Job",
      status: "inbox",
      score: 0
    });
    expect(jobInboxZero.score).toBe(0);
  });
});
