import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NeedsYou } from "./NeedsYou";

// Mock the useShortcuts hook
const mockUseSingleKeyShortcuts = vi.fn();
vi.mock("../../shared/useShortcuts", () => ({
  useShortcuts: () => {},
  useSingleKeyShortcuts: () => mockUseSingleKeyShortcuts(),
}));

describe("EditKeycap", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  it("renders Edit letter link with aria-keyshortcuts='E' and aria-hidden kbd", () => {
    // Mock useSingleKeyShortcuts to return true (enabled)
    mockUseSingleKeyShortcuts.mockReturnValue(true);

    const drafts = [
      {
        source_id: "1",
        title: "Test Job",
        company: "Test Company",
        location: "Test Location",
        score: 0.8,
        source: "api",
        language: "en",
        writer: "Test Writer",
        whyMatched: "Test match reason",
        gaps: "Test gaps",
        url: "https://example.com",
        posted: "2023-01-01",
        salary: "$50k",
      },
    ];

    render(
      <MemoryRouter>
        <NeedsYou drafts={drafts} busyId={null} onApprove={() => {}} onDeny={() => {}} />
      </MemoryRouter>
    );

    // Assert that the edit link has aria-keyshortcuts="E"
    const editLink = screen.getByRole("link", { name: "Edit letter" });
    expect(editLink).toHaveAttribute("aria-keyshortcuts", "E");

    // Assert that the hint line is present
    expect(screen.getByText("A approve · D skip · E edit")).toBeInTheDocument();
  });

  it("hides kbd, aria-keyshortcuts, and hint line when singleKeyShortcuts is disabled", () => {
    // Set localStorage to disable single key shortcuts
    localStorage.setItem("singleKeyShortcuts", "false");

    // Mock useSingleKeyShortcuts to return false (disabled)
    mockUseSingleKeyShortcuts.mockReturnValue(false);

    const drafts = [
      {
        source_id: "1",
        title: "Test Job",
        company: "Test Company",
        location: "Test Location",
        score: 0.8,
        source: "api",
        language: "en",
        writer: "Test Writer",
        whyMatched: "Test match reason",
        gaps: "Test gaps",
        url: "https://example.com",
        posted: "2023-01-01",
        salary: "$50k",
      },
    ];

    render(
      <MemoryRouter>
        <NeedsYou drafts={drafts} busyId={null} onApprove={() => {}} onDeny={() => {}} />
      </MemoryRouter>
    );

    // Assert that the edit link does not have aria-keyshortcuts
    const editLink = screen.getByRole("link", { name: "Edit letter" });
    expect(editLink).not.toHaveAttribute("aria-keyshortcuts");

    // Assert that the hint line is not present
    expect(screen.queryByText("A approve · D skip · E edit")).toBeNull();
  });
});
