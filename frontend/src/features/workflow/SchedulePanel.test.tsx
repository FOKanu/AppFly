import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchedulePanel } from "./SchedulePanel";

describe("SchedulePanel", () => {
  it("renders truthful schedule rows and resolved timezone", () => {
    const plan = {
      start: "21:00",
      days: [true, true, true, true, true, false, false],
      lettersPerRun: 5,
      shortlistSize: null,
    };

    render(<SchedulePanel plan={plan} readOnlyReason="Test note" />);

    expect(screen.getByText("Letters per run")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Shortlist size")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("cap")).toBeInTheDocument();
    expect(screen.getByText("top matches per run")).toBeInTheDocument();

    const resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(screen.getByText(resolvedTz)).toBeInTheDocument();

    expect(screen.queryByText("150")).not.toBeInTheDocument();
    expect(screen.queryByText(/threshold/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Max listings scouted")).not.toBeInTheDocument();
    expect(screen.queryByText("Shortlist threshold")).not.toBeInTheDocument();
  });
});
