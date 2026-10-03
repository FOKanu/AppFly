import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LastRunSummary } from "./LastRunSummary";

describe("LastRunSummary", () => {
  it("Writer card names only the real writer", () => {
    render(
      <LastRunSummary
        run={null}
        funnel={{}}
        writer={{ cloudLabel: "gemini-x" }}
        refusals={null}
      />
    );

    expect(screen.getByText(/gemini-x/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/8B|llama/i);
  });
});
