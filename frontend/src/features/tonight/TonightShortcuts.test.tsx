import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NeedsYou } from "./NeedsYou";
import { TonightHero } from "./TonightHero";
import type { Job } from "./types";

const draft: Job = { source_id: "j1", source: "api", title: "Platform Engineer", company: "Acme", status: "draft" };

function renderNeedsYou(props: { drafts?: Job[]; busyId?: string | null } = {}) {
  const onApprove = vi.fn();
  const onDeny = vi.fn();
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={<NeedsYou drafts={props.drafts ?? [draft]} busyId={props.busyId ?? null} onApprove={onApprove} onDeny={onDeny} />}
        />
        <Route path="/packet/:id" element={<p>packet page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { onApprove, onDeny };
}

describe("Tonight keyboard shortcuts", () => {
  it("A approves the top draft", () => {
    const { onApprove } = renderNeedsYou();
    fireEvent.keyDown(window, { key: "a" });
    expect(onApprove).toHaveBeenCalledWith(draft);
  });

  it("D denies the top draft", () => {
    const { onDeny } = renderNeedsYou();
    fireEvent.keyDown(window, { key: "d" });
    expect(onDeny).toHaveBeenCalledWith(draft);
  });

  it("A and D do nothing while the draft is saving", () => {
    const { onApprove, onDeny } = renderNeedsYou({ busyId: "j1" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "d" });
    expect(onApprove).not.toHaveBeenCalled();
    expect(onDeny).not.toHaveBeenCalled();
  });

  it("E opens the packet", () => {
    renderNeedsYou();
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByText("packet page")).toBeInTheDocument();
  });

  it("no draft, no keys", () => {
    const { onApprove } = renderNeedsYou({ drafts: [] });
    fireEvent.keyDown(window, { key: "a" });
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("G then Q reviews drafts", () => {
    const onReviewDrafts = vi.fn();
    render(<TonightHero run={null} draftCount={1} refusalCount={null} onOpenHome={vi.fn()} onReviewDrafts={onReviewDrafts} />);
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "q" });
    expect(onReviewDrafts).toHaveBeenCalledTimes(1);
  });
});
