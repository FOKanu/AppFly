import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockJobs } from "./jobsApi";
import { QueuePage } from "./QueuePage";

const renderQueue = () => {
  return render(
    <MemoryRouter initialEntries={["/queue"]}>
      <Routes>
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/queue/:sourceId" element={<QueuePage />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  resetMockJobs();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Queue undo after bulk moves", () => {
  it("undo keeps the partial-failure banner", async () => {
    // Mock fetch to make PATCH requests fail for specific jobs
    let patches = 0;
    const fetchMock = vi.fn((url: unknown, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patches++;
        if (String(url).includes("agentur-ref-77401")) {
          // This PATCH should fail
          return Promise.resolve(
            new Response(JSON.stringify({ detail: "boom" }), { status: 500 })
          );
        } else {
          // Other PATCHes should succeed
          return Promise.resolve(
            new Response(JSON.stringify({ source_id: "x", status: "approved" }), {
              status: 200,
            })
          );
        }
      }
      // Reject all non-PATCH requests
      return Promise.reject(new Error("offline"));
    });

    vi.stubGlobal("fetch", fetchMock);

    renderQueue();

    // Wait for jobs to load
    await screen.findAllByTestId("job-row");

    // Select both jobs
    const checkbox1 = screen.getByRole("checkbox", {
      name: "Select ML Platform Engineer",
    });
    const checkbox2 = screen.getByRole("checkbox", {
      name: "Select Engineering Manager, Search",
    });

    const user = userEvent.setup();
    await user.click(checkbox1);
    await user.click(checkbox2);

    // Bulk approve
    const approveButton = within(
      screen.getByTestId("job-list")
    ).getByRole("button", { name: /^Approve/ });
    await user.click(approveButton);

    // Wait for the error banner to appear
    await screen.findByText(/Could not move 1 of 2 jobs to Approved\./);

    // Click Undo
    const undoButton = screen.getByRole("button", { name: /^Undo/ });
    await user.click(undoButton);

    // Wait for all PATCH calls to complete
    await waitFor(() => expect(patches).toBe(3));

    // Verify the error banner is still visible
    expect(
      screen.getByText(/Could not move 1 of 2 jobs to Approved\./)
    ).toBeInTheDocument();
  });

  it("a failed undo shows the undo error", async () => {
    // Mock fetch to make first two PATCH requests succeed, then fail
    let patches = 0;
    const fetchMock = vi.fn((url: unknown, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patches++;
        if (patches <= 2) {
          // First two PATCHes should succeed
          return Promise.resolve(
            new Response(JSON.stringify({ source_id: "x", status: "approved" }), {
              status: 200,
            })
          );
        } else {
          // Third and subsequent PATCHes should fail
          return Promise.resolve(
            new Response(JSON.stringify({ detail: "boom" }), { status: 500 })
          );
        }
      }
      // Reject all non-PATCH requests
      return Promise.reject(new Error("offline"));
    });

    vi.stubGlobal("fetch", fetchMock);

    renderQueue();

    // Wait for jobs to load
    await screen.findAllByTestId("job-row");

    // Select both jobs
    const checkbox1 = screen.getByRole("checkbox", {
      name: "Select ML Platform Engineer",
    });
    const checkbox2 = screen.getByRole("checkbox", {
      name: "Select Engineering Manager, Search",
    });

    const user = userEvent.setup();
    await user.click(checkbox1);
    await user.click(checkbox2);

    // Bulk approve
    const approveButton = within(
      screen.getByTestId("job-list")
    ).getByRole("button", { name: /^Approve/ });
    await user.click(approveButton);

    // Wait for the success message to appear
    await screen.findByText("2 jobs → Approved");

    // Click Undo
    const undoButton = screen.getByRole("button", { name: /^Undo/ });
    await user.click(undoButton);

    // Wait for the undo error to appear
    const undoError = await screen.findByText(
      /Could not undo 2 of 2 jobs\. First error:/
    );
    expect(undoError).toBeInTheDocument();
  });
});
