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
});
