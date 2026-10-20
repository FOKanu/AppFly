import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.queryByText(/Jobs\/.*\.md/)).not.toBeInTheDocument();
    expect(screen.getByText("Match score")).toBeInTheDocument();
    expect(screen.queryByText(/Match breakdown/)).not.toBeInTheDocument();
    expect(screen.queryByText("Seniority")).not.toBeInTheDocument();

    const actions = screen.getByTestId("packet-actions");
    expect(within(actions).getByText(/local AppFly store/)).toBeInTheDocument();
    expect(actions.textContent).not.toMatch(/vault/i);
  });

  it("A approves the packet", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    // Let React flush the effect that registers the shortcut listener before pressing the key.
    await act(async () => {});
    fireEvent.keyDown(window, { key: "a" });
    expect(await screen.findByText(/Marked approved/)).toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "approved");
  });

  it("D denies the packet", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    await act(async () => {});
    fireEvent.keyDown(window, { key: "d" });
    expect(await screen.findByText(/Marked skipped/)).toBeInTheDocument();
  });

  it("A does nothing on an applied packet", async () => {
    renderPacket("agentur-ref-22091");
    await screen.findByRole("heading", { name: "Data Engineer" });
    await act(async () => {});
    fireEvent.keyDown(window, { key: "a" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/Marked approved/)).not.toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "applied");
  });

  it("approves and skips via PATCH status", async () => {
    const user = userEvent.setup();
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    await user.click(screen.getAllByRole("button", { name: /Approve packet/ })[0]!);
    expect(await screen.findByText(/Marked approved/)).toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "approved");

    expect(screen.queryByRole("button", { name: /^Deny/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Skip/ }));
    expect(await screen.findByText(/Marked skipped/)).toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "skipped");
  });

  it("shows the policy note and no fetch button when crawl_allowed is false", async () => {
    renderPacket("inbox-clip-linkedin-4f2a");
    await screen.findByRole("heading", { name: "Engineering Manager, Search" });
    expect(screen.queryByRole("button", { name: "Fetch listing" })).not.toBeInTheDocument();
    expect(screen.getByTestId("crawl-denied")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open listing" })[0]).toHaveAttribute(
      "href",
      "https://www.linkedin.com/jobs/view/1234567890",
    );
  });

  it("shows Open listing but no Fetch listing button for an allowed job, without loading other jobs", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    expect(screen.queryByRole("button", { name: "Fetch listing" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open listing" }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("crawl-denied")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Frontend Lead" })).not.toBeInTheDocument();
  });

  it("shows the real error, not 'PATCH failed', when approving fails", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: unknown, init?: RequestInit) =>
      init?.method === "PATCH"
        ? Promise.resolve(new Response(JSON.stringify({ detail: "boom" }), { status: 500 }))
        : Promise.reject(new Error("offline")),
    ));
    const user = userEvent.setup();
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    await user.click(screen.getAllByRole("button", { name: /Approve packet/ })[0]!);
    expect(await screen.findByText(/internal error \(HTTP 500\)/)).toBeInTheDocument();
    expect(screen.queryByText(/PATCH failed/)).not.toBeInTheDocument();
    expect(screen.queryByText("Couldn't load Packet")).not.toBeInTheDocument();
    expect(screen.getByTestId("status-chip")).toHaveAttribute("data-status", "draft");
  });

  it("names the letter's real model, not a hardcoded one", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    const panel = screen.getByTestId("letter-panel");
    expect(panel).toHaveTextContent("Gemini (model unknown)");
    expect(panel.textContent).not.toMatch(/gemini-3\.8-flash/);
  });

  it("an unscored job's meter does not claim 0 %", async () => {
    renderPacket("rss-https://jobs.example.org/feed#42");
    await screen.findByRole("heading", { name: "Backend Engineer (Rust)" });
    expect(screen.queryByRole("meter", { name: "Overall match" })).not.toBeInTheDocument();
    const track = screen.getByRole("img", { name: "Overall match: not scored" });
    expect(track.closest(".match-row")).toHaveTextContent("—");
  });

  it("the packet prints the score once", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    expect(screen.getAllByText("8.6")).toHaveLength(1);
    expect(screen.getByRole("meter", { name: "Overall match" })).toHaveAttribute("aria-valuenow", "86");
  });

  it("names the model from the letter API, then from regenerate", async () => {
    const live = {
      source_id: "live-1",
      source: "agentur",
      title: "Live Platform Engineer",
      company: "Livewerk",
      status: "draft",
      score: 0.8,
      letter_excerpt: "Excerpt",
      crawl_allowed: true,
    };
    const json = (body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", vi.fn((url: unknown, init?: RequestInit) => {
      const path = String(url);
      if (path.endsWith("/jobs/live-1/letter/regenerate") && init?.method === "POST") return json({ body: "Regenerated body", model: "gemini-y" });
      if (path.endsWith("/jobs/live-1/letter")) return json({ body: "Stored body", model: "gemini-x" });
      if (path.endsWith("/jobs/live-1")) return json(live);
      return Promise.reject(new Error("offline"));
    }));
    const user = userEvent.setup();
    renderPacket("live-1");
    await screen.findByRole("heading", { name: "Live Platform Engineer" });
    const panel = screen.getByTestId("letter-panel");
    await waitFor(() => expect(panel).toHaveTextContent("gemini-x"));
    await user.click(screen.getByRole("button", { name: "Regenerate letter" }));
    await waitFor(() => expect(panel).toHaveTextContent("gemini-y"));
    expect(panel).not.toHaveTextContent("Gemini (model unknown)");
  });

  it("Esc goes back to the queue", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    await act(async () => {});
    fireEvent.keyDown(window, { key: "Escape" });
    expect(await screen.findByText("queue-route")).toBeInTheDocument();
  });

  it("Esc in the letter editor stays on the packet", async () => {
    renderPacket("agentur-ref-88112");
    await screen.findByRole("heading", { name: "Staff Platform Engineer" });
    await act(async () => {});
    fireEvent.keyDown(screen.getByLabelText("Your edit of the application letter"), { key: "Escape" });
    expect(screen.queryByText("queue-route")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Staff Platform Engineer" })).toBeInTheDocument();
  });
});
