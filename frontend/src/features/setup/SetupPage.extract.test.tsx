import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  initWorkspace: vi.fn(),
  uploadDocument: vi.fn(),
}));
vi.mock("../vault/api", () => api);
vi.mock("../settings/settingsApi", () => ({ putConnectorSecret: vi.fn() }));
vi.mock("../vault/UploadZone", () => ({
  UploadZone: ({ onUpload }: { onUpload: (files: File[]) => void }) => (
    <button type="button" onClick={() => onUpload([new File(["x"], "cv.pdf")])}>
      mock upload
    </button>
  ),
}));

import { SetupPage } from "./SetupPage";

const status = {
  storage_backend: "native", data_path: "/d", has_cv: false, has_voice: false,
  has_gemini: false, has_keywords: false, job_count: 0,
};

async function toStep3() {
  render(<MemoryRouter><SetupPage /></MemoryRouter>);
  const next = await screen.findByRole("button", { name: "Next" });
  await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(next);
  fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
  fireEvent.click(await screen.findByRole("button", { name: "mock upload" }));
}

describe("SetupPage CV extraction result (bm4)", () => {
  beforeEach(() => {
    api.getWorkspace.mockReset().mockResolvedValue(status);
    api.initWorkspace.mockReset().mockResolvedValue(status);
    api.uploadDocument.mockReset();
  });

  it("shows a failed extraction and keeps Finish disabled", async () => {
    api.uploadDocument.mockResolvedValue({ id: "d1", kind: "cv", label: "cv.pdf", mime: "application/pdf", extract_status: "error" });
    await toStep3();
    expect(await screen.findByText("Stored cv.pdf, but text extraction failed.")).toBeTruthy();
    expect(screen.getByText("Upload a different file below: PDF, DOCX or TXT.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Finish" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an unsupported file type", async () => {
    api.uploadDocument.mockResolvedValue({ id: "d1", kind: "cv", label: "cv.pdf", mime: "application/pdf", extract_status: "unsupported" });
    await toStep3();
    expect(await screen.findByText("Stored cv.pdf, but the file type is not supported.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Finish" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("ok path is unchanged", async () => {
    api.uploadDocument.mockResolvedValue({ id: "d1", kind: "cv", label: "cv.pdf", mime: "application/pdf", extract_status: "ok" });
    await toStep3();
    expect(await screen.findByText("CV stored: cv.pdf.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Finish" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
