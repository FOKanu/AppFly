import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiHealthPanel } from "./ApiHealthPanel";

describe("ApiHealthPanel", () => {
  it("lists no local 8B writer", () => {
    const unknown = { status: "unknown" as const };
    render(
      <ApiHealthPanel
        health={{
          geminiFlash: unknown,
          arbeitsagentur: unknown,
          apify: unknown,
          minilm: unknown,
        }}
      />
    );
    expect(screen.getByText("Gemini")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Gemini Flash/);
    expect(document.body.textContent).not.toMatch(/8B|llama|Ollama/i);
  });
});
