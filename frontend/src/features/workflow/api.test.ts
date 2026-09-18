import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchWorkflow, retryGemini } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchWorkflow", () => {
  it("falls back to mock fixtures when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await fetchWorkflow();
    expect(result.source).toBe("mock");
    expect(result.data.stages).toHaveLength(3);
    expect(result.data.lastRun?.scouted).toBe(24);
  });
});

describe("retryGemini", () => {
  it("POSTs /api/write and does not treat network failure as success", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);
    const result = await retryGemini();
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Retry failed, API down");
    expect(fetchMock).toHaveBeenCalled();
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/api/write");
    expect(url).not.toMatch(/linkedin|indeed|stepstone|ziprecruiter/i);
  });

  it("reports success only when the write API returns OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    const result = await retryGemini();
    expect(result.ok).toBe(true);
  });
});
