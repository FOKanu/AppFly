import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchTonight } from "./api";
import { MOCK_DRAFTS } from "./mock";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchTonight", () => {
  it("falls back to mock fixtures when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await fetchTonight();
    expect(result.source).toBe("mock");
    expect(result.data.drafts).toEqual(MOCK_DRAFTS);
    expect(result.data.lastRun?.scouted).toBe(24);
  });

  it("uses API payloads when health and runs succeed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return new Response(JSON.stringify({ ok: true, api: "up" }), { status: 200 });
        }
        if (url.endsWith("/runs")) {
          return new Response(
            JSON.stringify({
              runs: [
                {
                  id: "live",
                  started_at: "2026-09-18T21:00:00Z",
                  status: "ok",
                  scouted: 3,
                  shortlisted: 1,
                  skipped: 2,
                  written: 1,
                  write_skipped: 0,
                  errors: [],
                  source_mix: { api: 3, rss: 0, clips: 0 },
                  stages: { scout: "done", match: "done", write: "done" },
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ jobs: [] }), { status: 200 });
      }),
    );
    const result = await fetchTonight();
    expect(result.source).toBe("api");
    expect(result.data.lastRun?.id).toBe("live");
    expect(result.data.health.ok).toBe(true);
  });
});
