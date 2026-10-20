import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkflowPage } from "./WorkflowPage";
import * as profileApi from "../profiles/api";
import { fetchRequirements } from "./requirementsApi";

vi.mock("../profiles/api");
// WorkflowPage fetches requirements on mount; keep that off the network here.
vi.mock("./requirementsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./requirementsApi")>();
  return {
    ...actual,
    fetchRequirements: vi.fn().mockRejectedValue(new Error("not under test")),
    saveRequirements: vi.fn(),
  };
});

// Import vitest globals explicitly
import { expect, vi, test } from 'vitest';

test("renders dashes when fetchSettings rejects", async () => {
  // Mock fetchSettings to reject with an offline error
  const mockFetchSettings = vi.spyOn(profileApi, "fetchSettings");
  mockFetchSettings.mockRejectedValue(new Error("offline"));

  render(
    <MemoryRouter>
      <WorkflowPage />
    </MemoryRouter>
  );

  // Wait for the component to update after the async operation
  await waitFor(() => {
    // Verify that dashes are rendered instead of cap numbers
    // Find the specific rows containing "Letters per run" and "Shortlist size"
    const lettersPerRunRow = screen.getByText("Letters per run");
    const shortlistSizeRow = screen.getByText("Shortlist size");

    // Check that the values in these rows are dashes
    expect(lettersPerRunRow.nextElementSibling?.textContent).toBe("—");
    expect(shortlistSizeRow.nextElementSibling?.textContent).toBe("—");

    // Verify that cap numbers are NOT present
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });
  expect(vi.mocked(fetchRequirements)).toHaveBeenCalledTimes(1);
});
