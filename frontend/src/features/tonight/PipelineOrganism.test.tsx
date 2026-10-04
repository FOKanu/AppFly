import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineOrganism } from "./PipelineOrganism";

describe("PipelineOrganism", () => {
  it("Write stage shows the real writer model", () => {
    render(<PipelineOrganism run={null} writerModel="gemini-x" />);

    expect(screen.getByText("gemini-x")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/8B|llama/i);
  });

  it("falls back to Gemini (model unknown) when the model is not known", () => {
    render(<PipelineOrganism run={null} writerModel={null} />);
    expect(screen.getByText("Gemini (model unknown)")).toBeTruthy();
  });
});
