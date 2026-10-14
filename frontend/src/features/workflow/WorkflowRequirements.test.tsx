import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import * as profileApi from "../profiles/api";
import { ApiError } from "../../shared/api/client";
import { fetchRequirements, saveRequirements } from "./requirementsApi";
import { WorkflowPage } from "./WorkflowPage";

vi.mock("../profiles/api");
vi.mock("./requirementsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./requirementsApi")>();
  return { ...actual, fetchRequirements: vi.fn(), saveRequirements: vi.fn() };
});

const PAYLOAD = { locations: ["Berlin"], salary_floor: 60000, languages: ["de", "en"], banned_terms: [], skip_companies: [], must_have: ["Python"], nice_to_have: [], tone: "warm", storage_backend: "native" };

beforeEach(() => {
  vi.mocked(profileApi.fetchSettings).mockReset();
  vi.mocked(profileApi.fetchSettings).mockRejectedValue(new Error("no settings in this test"));
  vi.mocked(fetchRequirements).mockReset();
  vi.mocked(saveRequirements).mockReset();
});

function renderPage() {
  return render(<MemoryRouter><WorkflowPage /></MemoryRouter>);
}

it("renders loaded requirements", async () => {
  vi.mocked(fetchRequirements).mockResolvedValue(PAYLOAD);
  renderPage();
  expect(await screen.findByText("Python")).toBeInTheDocument();
  expect(screen.getByText("Match · saved in the app")).toBeInTheDocument();
});

it("saves the draft and shows the toast", async () => {
  vi.mocked(fetchRequirements).mockResolvedValue(PAYLOAD);
  vi.mocked(saveRequirements).mockResolvedValue({ ...PAYLOAD, banned_terms: ["Zeitarbeit"] });
  renderPage();
  const user = userEvent.setup();
  await screen.findByText("Python");
  await user.type(screen.getByLabelText("Add to Banned terms"), "Zeitarbeit{Enter}");
  await user.click(screen.getByRole("button", { name: "Save requirements" }));
  expect(await screen.findByText("Requirements saved. They apply from the next run.")).toBeInTheDocument();
  expect(vi.mocked(saveRequirements).mock.calls[0][0].banned_terms).toEqual(["Zeitarbeit"]);
});

it("409 keeps the edit", async () => {
  vi.mocked(fetchRequirements).mockResolvedValue(PAYLOAD);
  vi.mocked(saveRequirements).mockRejectedValue(new ApiError("HTTP 409", 409, { detail: "x" }));
  renderPage();
  const user = userEvent.setup();
  await screen.findByText("Python");
  await user.type(screen.getByLabelText("Add to Banned terms"), "Zeitarbeit{Enter}");
  await user.click(screen.getByRole("button", { name: "Save requirements" }));
  expect(await screen.findByText("A run is in progress. Your edits are kept. Save again when it finishes.")).toBeInTheDocument();
  expect(screen.getByText("Zeitarbeit")).toBeInTheDocument();
});

it("load failure shows the banner", async () => {
  vi.mocked(fetchRequirements).mockRejectedValue(new Error("down"));
  renderPage();
  expect(await screen.findByText("Requirements not loaded")).toBeInTheDocument();
});
