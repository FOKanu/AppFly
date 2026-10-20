import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentTable } from "./DocumentTable";
import type { VaultDocument } from "./types";

const noop = () => undefined;
function doc(id: string, extract_status: VaultDocument["extract_status"]): VaultDocument {
  return { id, kind: "cv", label: `${id}.pdf`, mime: "application/pdf", extract_status } as VaultDocument;
}
function renderTable(documents: VaultDocument[]) {
  render(<DocumentTable documents={documents} enabled disabledReason="" busyId={null} onRename={noop} onDelete={noop} onSetActive={noop} />);
}

describe("Vault extraction status (vx1)", () => {
  it("marks only the failed document", () => {
    renderTable([doc("bad", "error"), doc("good", "ok")]);
    expect(screen.getAllByText("text extraction failed")).toHaveLength(1);
  });
  it("marks an unsupported file type", () => {
    renderTable([doc("odd", "unsupported")]);
    expect(screen.getByText("file type not supported")).toBeTruthy();
  });
  it("marks a file with no readable text", () => {
    renderTable([doc("scan", "empty")]);
    expect(screen.getByText("no readable text")).toBeTruthy();
  });
});
