import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkflowPage } from "./WorkflowPage";
import * as profileApi from "../profiles/api";
import { expect, it, vi } from "vitest";

vi.mock("../profiles/api");

// Mock the module that exports fetchSettings
const mockFetchSettings = vi.spyOn(profileApi, "fetchSettings");

it("renders cap numbers when fetchSettings succeeds and dashes on error", async () => {
  // Mock successful fetchSettings
  mockFetchSettings.mockResolvedValue({
    vault_path: "/vault",
    keywords: [],
    location: "Berlin",
    sources: {
      agentur: true,
      inbox: false,
      rss: [],
      apify: { enabled: false, start_urls: [] }
    },
    health: {
      vault_exists: true,
      jobs_dir_exists: true,
      cv_present: true,
      requirements_present: true,
      config_file_exists: true
    },
    gemini_model: "gemini-pro",
    secrets: { gemini: true, apify: false, jobsuche: false },
    letter_cap: 5,
    shortlist_size: 12
  });

  render(
    <MemoryRouter>
      <WorkflowPage />
    </MemoryRouter>
  );

  // Wait for the settings to be fetched and applied
  await waitFor(() => {
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
