import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProfileRequirements } from "./ProfileRequirements";
import { ProfileSettings } from "./ProfileSettings";
import type { HuntProfile } from "./types";

const profile: HuntProfile = {
  id: "p1", name: "Dev · Berlin", roleTitles: ["Dev"], location: "Berlin", secondaryTitles: [], vaultPath: "/v",
  sources: { agentur: true, inbox: true, rss: [], apifyEnabled: false, apifyStartUrls: [] },
  health: { vaultExists: true, cvPresent: true, requirementsPresent: true },
};
const noop = () => undefined;

describe("Profiles match filters (mf4)", () => {
  it("links to Workflow → Requirements", () => {
    render(<MemoryRouter><ProfileRequirements profile={profile} onToggleSource={noop} savingSources={false} /></MemoryRouter>);
    const link = screen.getByRole("link", { name: "Workflow → Requirements" });
    expect(link.getAttribute("href")).toBe("/workflow#requirements");
    expect(screen.queryByText("Skip companies", { exact: true })).toBeNull();
    expect(screen.queryByLabelText("Skip companies")).toBeNull();
    expect(screen.getByText("This list is not editable from the UI, by design.", { exact: false })).toBeTruthy();
  });
  it("has no salary floor input and two not-stored tags", () => {
    render(<MemoryRouter><ProfileSettings value={{ roleTitles: ["Dev"], location: "Berlin", seniority: "senior", salaryFloor: null, workMode: "remote" }} onChange={noop} saving={false} dirty={false} onSave={noop} onRevert={noop} /></MemoryRouter>);
    expect(screen.queryByLabelText("Salary floor in euros")).toBeNull();
    expect(screen.getAllByText("not stored yet")).toHaveLength(2);
  });
});
