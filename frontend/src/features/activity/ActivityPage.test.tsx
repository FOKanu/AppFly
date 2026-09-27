import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityPage } from "./ActivityPage";
import { normalizeRuns } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeRuns", () => {
  it("redacts keys inside run errors", () => {
    const runs = normalizeRuns([
      {
        id: "1",
        date: "2026-09-18",
        scouted: 1,
        errors: ["write: GEMINI_API_KEY=AIzaSyShouldNeverAppearInTheUi01234567"],
      },
    ]);
    expect(runs[0]?.errors.join(" ")).not.toMatch(/AIza/);
    expect(runs[0]?.errors.join(" ")).not.toContain("ShouldNeverAppearInTheUi");
    expect(runs[0]?.errors.join(" ")).toContain("[redacted]");
  });
});

describe("ActivityPage", () => {
  it("renders funnel and redacted errors from GET /runs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/runs")) {
          return jsonResponse([
            {
              id: "2026-09-18",
              date: "2026-09-18",
              started: "2026-09-18T21:00:00Z",
              finished: "2026-09-18T21:04:00Z",
              scouted: 4,
              shortlisted: 2,
              skipped: 1,
              written: 1,
              write_skipped: 0,
              model: "gemini-3.8-flash",
              errors: ['{"api_key":"sk-leaked-token-value-123456"}'],
            },
          ]);
        }
        if (url.includes("/jobs")) {
          return jsonResponse({
            counts: { inbox: 3, shortlist: 2, draft: 1, approved: 0, applied: 0, skipped: 1 },
          });
        }
        return new Response("missing", { status: 404 });
      }),
    );

    render(<ActivityPage />);
    // The page title lives in the app header, so assert on the funnel card.
    expect(await screen.findByText("Conversion funnel")).toBeInTheDocument();
    expect(screen.getByText("Scouted")).toBeInTheDocument();
    expect(screen.queryByText(/sk-leaked-token-value/)).not.toBeInTheDocument();
    expect(screen.getByText(/\[redacted\]/)).toBeInTheDocument();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
