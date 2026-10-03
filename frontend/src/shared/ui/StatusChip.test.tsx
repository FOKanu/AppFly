import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusChip as QueueStatusChip } from "../../features/queue/StatusChip";
import { StatusChip } from "./StatusChip";

describe("StatusChip labels", () => {
  it("shows the readable label and keeps the raw data-status", () => {
    render(<StatusChip status="shortlist" />);
    const chip = screen.getByText("Shortlist");
    expect(chip).toHaveAttribute("data-status", "shortlist");
  });

  it("an explicit label still wins", () => {
    render(<StatusChip status="draft" label="Custom" />);
    expect(screen.getByText("Custom")).toHaveAttribute("data-status", "draft");
  });

  it("the queue chip shows the readable label too", () => {
    render(<QueueStatusChip status="draft" />);
    const chip = screen.getByTestId("status-chip");
    expect(chip).toHaveTextContent("Draft");
    expect(chip).toHaveAttribute("data-status", "draft");
  });
});
