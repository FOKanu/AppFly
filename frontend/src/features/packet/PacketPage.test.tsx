import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PacketPage } from "./PacketPage";
import { MOCK_JOBS } from "../queue/mockJobs";
import { resetMockJobs } from "../queue/jobsApi";

function renderPacket(sourceId: string) {
  return render(
    <MemoryRouter initialEntries={[`/packet/${encodeURIComponent(sourceId)}`]}>
      <Routes>
        <Route path="/packet/:sourceId" element={<PacketPage />} />
        <Route path="/queue/:sourceId" element={<div>queue-route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PacketPage", () => {
  beforeEach(() => {
    resetMockJobs();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows a sealed packet for one job, not the whole vault", async () => {
    renderPacket("agentur-ref-88112");
    expect(await screen.findByRole("heading", { name: "Staff Platform Engineer" })).toBeInTheDocument();
    expect(screen.getByTestId("letter-panel")).toHaveTextContent("Nordlicht Systems");
    for (const job of MOCK_JOBS) {
      if (job.source_id === "agentur-ref-88112") continue;
      expect(screen.queryByRole("heading", { name: job.title })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Master\.md|Voice-samples|CV slice/i)).not.toBeInTheDocument();
  });

  it("approves and skips via PATCH status", async () => {
    const user = userEvent.setup();
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(await screen.findByText(/Marked approved/)).toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "approved");

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(await screen.findByText(/Marked skipped/)).toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "skipped");
  });

  it("hides fetch listing when crawl_allowed is false", async () => {
    renderPacket("inbox-clip-linkedin-4f2a");
    await screen.findByRole("heading", { name: "Engineering Manager, Search" });
    expect(screen.queryByRole("button", { name: "Fetch listing" })).not.toBeInTheDocument();
    expect(screen.getByTestId("crawl-denied")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open listing" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/jobs/view/1234567890",
    );
  });

  it("offers fetch listing only when crawl is allowed, without loading other jobs", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    expect(screen.getByRole("button", { name: "Fetch listing" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Frontend Lead" })).not.toBeInTheDocument();
  });
});
