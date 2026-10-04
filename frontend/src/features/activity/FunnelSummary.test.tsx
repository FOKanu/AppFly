import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FunnelSummary } from "./FunnelSummary";

describe("FunnelSummary", () => {
  const jobs = { inbox: 0, shortlist: 0, draft: 0, approved: 0, applied: 0, skipped: 0 };
  const zero = { scouted: 0, shortlisted: 0, skipped: 0, written: 0, writeSkipped: 0, jobs };

  it("shows a dash per stage when there is no data", () => {
    const { container } = render(<FunnelSummary funnel={zero} />);
    const cells = [...container.querySelectorAll(".funnel-stage__value")].map((el) => el.textContent);
    expect(cells).toEqual(["—", "—", "—", "—", "—"]);
  });

  it("shows real counts", () => {
    const { container } = render(<FunnelSummary funnel={{ ...zero, scouted: 4, shortlisted: 2 }} />);
    const cells = [...container.querySelectorAll(".funnel-stage__value")].map((el) => el.textContent);
    expect(cells).toEqual(["4", "2", "0", "0", "0"]);
  });

  it("labels all-time stages and gives them no rate", () => {
    const { container } = render(<FunnelSummary funnel={{ ...zero, scouted: 5, jobs: { ...jobs, applied: 12 } }} />);
    const pcts = [...container.querySelectorAll(".funnel-stage__pct")].map((el) => el.textContent);
    expect(pcts).toEqual(["100.0%", "0.0%", "0.0%", "—", "—"]);
    expect(screen.getAllByText(/all time/)).toHaveLength(2);
  });

  it("gives the empty dash an accessible name", () => {
    render(<FunnelSummary funnel={zero} loaded />);
    expect(screen.getAllByRole("img", { name: "no data" })).toHaveLength(5);
  });

  it("draws no meter for all-time stages", () => {
    render(<FunnelSummary funnel={{ ...zero, scouted: 5, jobs: { ...jobs, applied: 12 } }} />);
    expect(screen.getAllByRole("meter")).toHaveLength(3);
  });

  it("says when the API has no runs in the window", () => {
    const { rerender } = render(<FunnelSummary funnel={zero} loaded />);
    expect(screen.getByText("No runs in the last 30 days.")).toBeInTheDocument();
    rerender(<FunnelSummary funnel={zero} />);
    expect(screen.queryByText(/No runs in the last/)).not.toBeInTheDocument();
    rerender(<FunnelSummary funnel={{ ...zero, scouted: 4 }} loaded />);
    expect(screen.queryByText(/No runs in the last/)).not.toBeInTheDocument();
  });

  it("says loading before the data arrives", () => {
    render(<FunnelSummary funnel={zero} />);
    expect(screen.getAllByRole("img", { name: "loading" })).toHaveLength(5);
  });

  it("names the rate dashes", () => {
    render(<FunnelSummary funnel={zero} loaded />);
    expect(screen.getAllByRole("img", { name: "no rate" })).toHaveLength(5);
  });

  it("draws no meters while the funnel is empty", () => {
    render(<FunnelSummary funnel={zero} loaded />);
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
  });
});
