import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NeedsYou } from "./NeedsYou";
import { Job } from "./types";
import { setSingleKeyShortcuts } from "../../shared/useShortcuts";

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
    const draft: Job = {
      source_id: "j1",
      source: "api",
      title: "Platform Engineer",
      company: "Acme",
      status: "draft",
      location: "Test Location",
      score: 0.8,
      language: "en",
      writer: "Test Writer",
      whyMatched: "Test match reason",
      gaps: "Test gaps",
      url: "https://example.com",
      posted: "2023-01-01",
      salary: "$50k",
    };

    render(
      <MemoryRouter>
        <NeedsYou drafts={[draft]} busyId={null} onApprove={() => {}} onDeny={() => {}} />
      </MemoryRouter>
    );

    // Assert that the edit link has aria-keyshortcuts="E"
    const editLink = screen.getByRole("link", { name: "Edit letter" });
    expect(editLink).toHaveAttribute("aria-keyshortcuts", "E");

    // Assert that the hint line is present
    expect(screen.getByText("A approve · D skip · E edit")).toBeInTheDocument();

    // Assert that kbd element has aria-hidden="true"
    expect(editLink.querySelector("kbd")).toHaveAttribute("aria-hidden", "true");
  });

  it("hides kbd, aria-keyshortcuts, and hint line when singleKeyShortcuts is disabled", () => {
    // Disable single key shortcuts
    setSingleKeyShortcuts(false);

    const draft: Job = {
      source_id: "j1",
      source: "api",
      title: "Platform Engineer",
      company: "Acme",
      status: "draft",
      location: "Test Location",
      score: 0.8,
      language: "en",
      writer: "Test Writer",
      whyMatched: "Test match reason",
      gaps: "Test gaps",
      url: "https://example.com",
      posted: "2023-01-01",
      salary: "$50k",
    };

    render(
      <MemoryRouter>
        <NeedsYou drafts={[draft]} busyId={null} onApprove={() => {}} onDeny={() => {}} />
      </MemoryRouter>
    );

    // Assert that the edit link does not have aria-keyshortcuts
    const editLink = screen.getByRole("link", { name: "Edit letter" });
    expect(editLink).not.toHaveAttribute("aria-keyshortcuts");

    // Assert that the hint line is not present
    expect(screen.queryByText("A approve · D skip · E edit")).toBeNull();

    // Assert that kbd element is null
    expect(editLink.querySelector("kbd")).toBeNull();
  });
});
