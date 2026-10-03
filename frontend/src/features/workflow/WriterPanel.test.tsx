import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WriterPanel } from "./SchedulePanel";

describe("WriterPanel", () => {
  it("shows only the real cloud writer", () => {
    render(
      <WriterPanel
        mode="cloud"
        readOnlyReason="x"
        tokenHistory={[]}
        cloudLabel="gemini-x"
      />
    );
    expect(screen.getByText("gemini-x")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/8B|llama|local/i);
  });

  it("labels the model as configured, and errors as run errors", () => {
    render(<WriterPanel mode="cloud" readOnlyReason="x" tokenHistory={[]} cloudLabel="gemini-x" />);
    expect(screen.getByText("Configured model")).toBeTruthy();
    expect(screen.getByText("No run errors recorded.")).toBeTruthy();
    expect(screen.queryByText(/Last backend used/)).toBeNull();
  });
});
