import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LastRunSummary } from "./LastRunSummary";
import type { Run } from "./types";

const run = { id: "r1", started_at: "2026-10-01T22:00:00Z", status: "completed", errors: [], stages: {} } as unknown as Run;

describe("LastRunSummary", () => {
  it("Writer card names only the real writer", () => {
    render(
      <LastRunSummary
        run={run}
        funnel={{}}
        writer={{ cloudLabel: "gemini-x" }}
        refusals={null}
      />
    );

    expect(screen.getByText(/gemini-x/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/8B|llama/i);
  });

  it("legend falls back to Gemini (model unknown)", () => {
    render(<LastRunSummary run={run} funnel={{}} writer={{}} refusals={null} />);
    expect(screen.getByText(/Gemini \(model unknown\)/)).toBeTruthy();
  });

  it("policy line names every banned brand, including Wellfound", () => {
    render(<LastRunSummary run={null} funnel={{}} writer={{}} refusals={null} />);
    expect(screen.getByText(/Wellfound \(AngelList\)/)).toBeTruthy();
    expect(screen.getByText(/LinkedIn/)).toBeTruthy();
  });

  it("with no run the legend says No runs yet", () => {
    render(<LastRunSummary run={null} funnel={{}} writer={{}} refusals={null} />);
    expect(screen.getByText("No runs yet")).toBeTruthy();
    expect(screen.queryByText(/Gemini \(model unknown\)/)).toBeNull();
  });

  it("policy line states the guarantee, not a fetch count", () => {
    render(<LastRunSummary run={run} funnel={{}} writer={{}} refusals={[]} />);
    expect(document.body.textContent).not.toMatch(/0 fetches/);
    expect(screen.getByText(/Blocked before any request: LinkedIn/)).toBeTruthy();
  });

  it("no meters while the counts are unknown", () => {
    render(<LastRunSummary run={null} funnel={{}} writer={{}} refusals={null} />);
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
  });

  it("meters when counts exist", () => {
    render(<LastRunSummary run={run} funnel={{ scouted: 10, shortlisted: 4 }} writer={{}} refusals={null} />);
    expect(screen.getAllByRole("meter")).toHaveLength(2);
  });
});
