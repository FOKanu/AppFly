import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockJobs } from "./jobsApi";
import { QueuePage } from "./QueuePage";

function renderQueue(path = "/queue") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/queue/:sourceId" element={<QueuePage />} />
        <Route path="/packet/:sourceId" element={<div>packet-route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("QueuePage", () => {
  beforeEach(() => {
    resetMockJobs();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a master-detail queue with chips, badges, and scores", async () => {
    renderQueue();
    expect(await screen.findByTestId("queue-page")).toBeInTheDocument();
    expect(screen.getByTestId("mock-banner")).toBeInTheDocument();
    const rows = await screen.findAllByTestId("job-row");
    expect(rows.length).toBeGreaterThan(3);
    expect(screen.getAllByTestId("status-chip").length).toBeGreaterThan(3);
    expect(screen.getAllByTestId("source-badge").some((el) => el.textContent === "Agentur API")).toBe(true);
    expect(screen.getAllByTestId("source-badge").some((el) => el.textContent === "Apify · Impressum only")).toBe(
      true,
    );
    expect(screen.getAllByTestId("match-score").length).toBeGreaterThan(0);
    // Default sort is by score — ML Platform Engineer (0.91) leads the sample set.
    expect(screen.getByTestId("queue-detail")).toHaveTextContent("ML Platform Engineer");
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findAllByTestId("job-row");
    await user.click(screen.getByRole("button", { name: /^skipped\b/i }));
    const rows = screen.getAllByTestId("job-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Frontend Lead");
  });

  it("selecting a row updates the detail pane", async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findAllByTestId("job-row");
    await user.click(screen.getByRole("button", { name: /Engineering Manager, Search/i }));
    const detail = screen.getByTestId("queue-detail");
    expect(detail).toHaveTextContent("Engineering Manager, Search");
    expect(detail).toHaveTextContent("crawl_allowed is false");
    expect(detail.querySelector("a[href='https://www.linkedin.com/jobs/view/1234567890']")).not.toBeNull();
    expect(detail.textContent).not.toMatch(/Fetch listing/i);
  });

  it("rolls back and says so when saving a status fails", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: unknown, init?: RequestInit) =>
      init?.method === "PATCH"
        ? Promise.resolve(new Response(JSON.stringify({ detail: "boom" }), { status: 500 }))
        : Promise.reject(new Error("offline")),
    ));
    const user = userEvent.setup();
    renderQueue();
    await screen.findAllByTestId("job-row");
    await user.click(screen.getByRole("button", { name: /Approve packet/ }));
    expect(await screen.findByText("Couldn't save")).toBeInTheDocument();
    expect(within(screen.getByTestId("queue-detail")).getByTestId("status-chip")).toHaveAttribute("data-status", "shortlist");
    expect(screen.queryByText("Couldn't load Queue")).not.toBeInTheDocument();
  });
});
