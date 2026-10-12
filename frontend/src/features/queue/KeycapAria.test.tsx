import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UndoToast } from "./UndoToast";
import { PacketSpec } from "../packet/PacketSpec";
import type { JobRecord } from "../queue/types";

// This file tests the ARIA attributes for keycaps in PacketSpec and UndoToast components
// as required by the BRIEF pv2-b7d

describe("Keycap ARIA attributes", () => {
  // Test that UndoToast has correct aria-keyshortcuts and kbd aria-hidden
  it("UndoToast has correct aria attributes", () => {
    const mockEntry = {
      status: "saved" as const,
      changes: [
        {
          sourceId: "test-id",
          title: "Test Job",
          previous: "new" as const
        }
      ]
    };

    const { container } = render(
      <MemoryRouter>
        <UndoToast
          entry={mockEntry}
          onUndo={() => {}}
          onDismiss={() => {}}
        />
      </MemoryRouter>
    );

    const undoButton = container.querySelector('.undo-toast__action');
    const kbdElement = container.querySelector('kbd.kbd');

    if (!undoButton) {
      throw new Error("Undo button not found");
    }

    if (!kbdElement) {
      throw new Error("Kbd element not found");
    }

    expect(undoButton).toHaveAttribute('aria-keyshortcuts', 'Meta+Z Control+Z');
    expect(kbdElement).toHaveAttribute('aria-hidden', 'true');
  });

  // Test that PacketSpec has correct aria-keyshortcuts and kbd aria-hidden
  it("PacketSpec has correct aria attributes", () => {
    const mockJob: JobRecord = {
      id: "test-id",
      source_id: "source-123",
      title: "Test Job",
      company: "Test Company",
      location: "Test Location",
      url: "https://example.com",
      posted: "2023-01-01",
      score: 0.8,
      status: "new",
      source: "test-source",
      lang: "en",
      crawl_allowed: true,
      description: "Test description"
    };

    const { container } = render(
      <MemoryRouter>
        <PacketSpec job={mockJob} />
      </MemoryRouter>
    );

    const backButton = container.querySelector('.packet-spec__back');
    const kbdElement = container.querySelector('kbd.kbd');

    if (!backButton) {
      throw new Error("Back button not found");
    }

    if (!kbdElement) {
      throw new Error("Kbd element not found");
    }

    expect(backButton).toHaveAttribute('aria-keyshortcuts', 'Escape');
    expect(kbdElement).toHaveAttribute('aria-hidden', 'true');
  });
});
