import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { NeedsYou } from "./NeedsYou";
import { PacketPage } from "../packet/PacketPage";
import { setSingleKeyShortcuts } from "../../shared/useShortcuts";
import { MOCK_JOBS } from "../queue/mockJobs";
import { resetMockJobs } from "../queue/jobsApi";

// Mock the PacketPage to include a probe for testing
const MockPacketPage = () => {
  const { sourceId = "" } = useParams();
  return <div data-testid="probe">{sourceId}</div>;
};

const mockDrafts = [
  {
    source_id: "https://ex.com/jobs/42",
    title: "Frontend Developer",
    company: "Acme Corp",
    location: "Remote",
    score: 85,
    source: "api",
    whyMatched: "Matched skills",
    gaps: "Missing experience",
    url: "https://ex.com/jobs/42",
  },
  {
    source_id: "https://ex.com/jobs/43",
    title: "Backend Developer",
    company: "Globex Inc",
    location: "New York",
    score: 75,
    source: "rss",
    whyMatched: "Relevant experience",
    gaps: "No gaps",
    url: "https://ex.com/jobs/43",
  },
];

const renderNeedsYouWithRouter = (drafts: typeof mockDrafts) => {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={<NeedsYou
            drafts={drafts}
            busyId={null}
            onApprove={() => {}}
            onDeny={() => {}}
          />}
        />
        <Route
          path="/packet/:sourceId"
          element={<MockPacketPage />}
        />
      </Routes>
    </MemoryRouter>
  );
};

// Helper function to render PacketPage with proper encoding
function renderPacket(sourceId: string) {
  return render(
    <MemoryRouter initialEntries={[`/packet/${encodeURIComponent(sourceId)}`]}>
      <Routes>
        <Route path="/packet/:sourceId" element={<PacketPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Helper to stub a job for testing
function stubJob(id: string) {
  resetMockJobs();
  const job = { ...MOCK_JOBS[0], source_id: id };
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(`/jobs/${encodeURIComponent(id)}`))
      return Promise.resolve(new Response(JSON.stringify(job), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    return Promise.reject(new Error("offline"));
  }));
  return job;
}

describe("NeedsYouPacketLinks", () => {
  afterEach(() => {
    setSingleKeyShortcuts(false);
    vi.unstubAllGlobals();
  });

  it("navigates to encoded packet route on Edit letter click", async () => {
    const user = userEvent.setup();
    renderNeedsYouWithRouter(mockDrafts);

    const editLetterButton = screen.getByText("Edit letter");
    await user.click(editLetterButton);

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveTextContent("https://ex.com/jobs/42");
  });

  it("navigates to encoded packet route on other-drafts row click", async () => {
    const user = userEvent.setup();
    renderNeedsYouWithRouter(mockDrafts);

    const otherDraftRow = screen.getByText("Backend Developer").closest("a");
    if (!otherDraftRow) throw new Error("Other draft row not found");
    await user.click(otherDraftRow);

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveTextContent("https://ex.com/jobs/43");
  });

  it("navigates to encoded packet route on 'e' keyboard shortcut", async () => {
    setSingleKeyShortcuts(true);
    const user = userEvent.setup();
    renderNeedsYouWithRouter(mockDrafts);

    await user.keyboard("e");

    const probe = screen.getByTestId("probe");
    expect(probe).toHaveTextContent("https://ex.com/jobs/42");
  });

  it("PacketPage opens an id containing %", async () => {
    const job = stubJob("inbox-50%-remote");
    renderPacket("inbox-50%-remote");
    expect(await screen.findByRole("heading", { name: job.title })).toBeInTheDocument();
  });

  it("PacketPage does not decode the id twice", async () => {
    const job = stubJob("https://ex.com/a?q=a%20b");
    renderPacket("https://ex.com/a?q=a%20b");
    expect(await screen.findByRole("heading", { name: job.title })).toBeInTheDocument();
  });
});
