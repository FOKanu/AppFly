import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, test, expect } from "vitest";
import { RequirementsPanel } from "./RequirementsPanel";

const DRAFT = {
  locations: ["Berlin"],
  salary_floor: 60000,
  languages: ["de", "en"],
  banned_terms: [],
  skip_companies: [],
  must_have: ["Python"],
  nice_to_have: [],
  tone: "warm"
};

const onChange = vi.fn();

const renderPanel = (overrides = {}) => {
  return render(
    <RequirementsPanel
      state="ready"
      storageBackend="native"
      value={DRAFT}
      onChange={onChange}
      dirty={false}
      saving={false}
      error={null}
      onSave={vi.fn()}
      onRevert={vi.fn()}
      {...overrides}
    />
  );
};

describe("RequirementsPanel", () => {
  test("renders native kicker", () => {
    renderPanel();
    expect(screen.getByText("Match · saved in the app")).toBeInTheDocument();
  });

  test("typing 'Zeitarbeit' + Enter into Banned terms input calls onChange", async () => {
    renderPanel();

    const user = userEvent.setup();
    const input = screen.getByLabelText("Add to Banned terms");

    await user.type(input, "Zeitarbeit{Enter}");

    expect(onChange).toHaveBeenCalledWith({
      ...DRAFT,
      banned_terms: ["Zeitarbeit"]
    });
  });

  test("Save requirements button is disabled when dirty=false", () => {
    renderPanel({ dirty: false });
    const saveButton = screen.getByRole("button", { name: "Save requirements" });
    expect(saveButton).toBeDisabled();
  });

  test("error message renders as alert", () => {
    renderPanel({ error: "Not saved: boom" });
    expect(screen.getByRole("alert")).toHaveTextContent("Not saved: boom");
  });

  test("state='error' shows error banner and no textboxes", () => {
    renderPanel({ state: "error" });

    expect(screen.getByText("Requirements not loaded")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  test("Letter tone is a textbox and not a tablist", () => {
    renderPanel();

    expect(screen.getByRole("textbox", { name: "Letter tone" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  test("Letter tone textbox has correct aria-describedby and help text", () => {
    renderPanel();

    const toneInput = screen.getByRole("textbox", { name: "Letter tone" });
    expect(toneInput).toHaveAttribute("aria-describedby", "req-help-tone");

    const helpText = document.getElementById("req-help-tone");
    expect(helpText).toHaveTextContent("One line the writer follows for tone.");
  });
});
