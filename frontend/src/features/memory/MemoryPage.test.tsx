import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeMemory } from "./api";
import { MemoryPage } from "./MemoryPage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeMemory", () => {
  it("keeps CV stats and drops CV body", () => {
    const view = normalizeMemory(
      {
        vault_path: "/vault",
        cv: "Jane Doe worked at SecretCorp building classified widgets for ten years.",
        keywords: ["Python"],
        location: "Berlin",
        sources: { agentur: true, inbox: true, rss: [], apify: { enabled: false } },
      },
      { jobs: [{ status: "inbox" }, { status: "draft" }, { status: "draft" }] },
      "api",
    );
    expect(JSON.stringify(view)).not.toContain("SecretCorp");
    expect(JSON.stringify(view)).not.toContain("classified widgets");
    expect(view.cv.path).toContain("CV/Master.md");
    expect(view.cv.wordCount).toBeGreaterThan(5);
    expect(view.jobCounts.inbox).toBe(1);
    expect(view.jobCounts.draft).toBe(2);
  });
});

describe("MemoryPage", () => {
  it("renders paths and counts without inlining the CV", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/settings")) {
          return jsonResponse({
            vault_path: "~/Documents/Job Search",
            cv: "THIS_CV_BODY_MUST_NOT_REACH_THE_DOM experience at HiddenEmployer",
            keywords: ["Software Engineer"],
            location: "Berlin",
            radius_km: 50,
            published_days: 7,
            sources: { agentur: true, inbox: true, rss: [], apify: { enabled: false } },
            requirements: {
              locations: ["Berlin"],
              languages: ["en"],
              banned_terms: ["Zeitarbeit"],
            },
          });
        }
        if (url.includes("/jobs")) {
          return jsonResponse([{ status: "shortlist" }, { status: "applied" }]);
        }
        return new Response("missing", { status: 404 });
      }),
    );

    render(<MemoryPage />);
    // The page title lives in the app header, so the screen itself starts at
    // the profile column.
    expect(await screen.findByText("Search preset profiles")).toBeInTheDocument();
    expect(screen.getByText("~/Documents/Job Search/CV/Master.md")).toBeInTheDocument();
    expect(screen.queryByText(/THIS_CV_BODY_MUST_NOT_REACH_THE_DOM/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HiddenEmployer/)).not.toBeInTheDocument();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
