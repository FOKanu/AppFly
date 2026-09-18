import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJob, listJobs, patchJobStatus, requestListingFetch, resetMockJobs } from "./jobsApi";

describe("jobsApi", () => {
  beforeEach(() => {
    resetMockJobs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to the sample queue when GET /jobs fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await listJobs();
    expect(result.usingMock).toBe(true);
    expect(result.jobs.length).toBeGreaterThan(0);
    expect(result.jobs.map((job) => job.status).sort()).toContain("draft");
  });

  it("loads GET /jobs when the API responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
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

  it("does not fetch listing HTML and refuses crawl when crawl_allowed is false", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const denied = await requestListingFetch("inbox-clip-linkedin-4f2a", false);
    expect(denied.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRejectedValue(new Error("offline"));
    const allowed = await requestListingFetch("agentur-ref-88112", true);
    expect(allowed.ok).toBe(false);
    const requested = String(fetchMock.mock.calls[0]?.[0] ?? "");
    expect(requested).toContain("/jobs/agentur-ref-88112/fetch");
    expect(requested).not.toMatch(/linkedin|indeed|stepstone|ziprecruiter/i);
  });
});
