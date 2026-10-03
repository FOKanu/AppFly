import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LetterWorkbench } from "./LetterWorkbench";

describe("LetterWorkbench", () => {
  it("disables Save and Regenerate while a request is pending", () => {
    render(<LetterWorkbench aiDraft="Hi" busy onSave={vi.fn()} onRegenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Regenerate letter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Save letter/ })).toBeDisabled();
  });

  it("enables them when idle", () => {
    render(<LetterWorkbench aiDraft="Hi" busy={false} onSave={vi.fn()} onRegenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Regenerate letter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Save letter/ })).toBeEnabled();
  });

  it("Regenerate tooltip names no model", () => {
    render(<LetterWorkbench aiDraft="Hi" onSave={vi.fn()} onRegenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Regenerate letter" })).toHaveAttribute("title", "Regenerate letter");
  });
});
