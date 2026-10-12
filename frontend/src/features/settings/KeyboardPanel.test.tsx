import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, afterEach, test, expect } from "vitest";
import { KeyboardPanel } from "./KeyboardPanel";
import { SettingsPage } from "./SettingsPage";
import { MemoryRouter } from "react-router-dom";

beforeEach(() => {
  // Clear localStorage before each test
  localStorage.clear();
});

afterEach(() => {
  // Clear localStorage after each test
  localStorage.clear();
});

// Vitest test format - no describe wrapper needed
test("toggles single-key shortcuts and updates localStorage", () => {
  // Mock initial state as "on"
  localStorage.setItem("appfly.shortcuts.single-key", "on");

  render(<KeyboardPanel />);

  // Check that the switch is initially checked
  const switchElement = screen.getByRole("switch", { name: "Single-key shortcuts" });
  expect(switchElement).toBeChecked();

  // Check that ON state line is displayed
  expect(screen.getByText("On — keycaps on buttons are live.")).toBeInTheDocument();

  // Click the switch to turn it off
  fireEvent.click(switchElement);

  // Check that localStorage was updated
  expect(localStorage.getItem("appfly.shortcuts.single-key")).toBe("off");

  // Check that aria-checked is now false
  expect(switchElement).toHaveAttribute("aria-checked", "false");

  // Check that OFF state line is displayed
  expect(screen.getByText("Off — keycaps are hidden. Use the buttons.")).toBeInTheDocument();
});

test("KeyboardPanel is rendered within SettingsPage", () => {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );

  // Check that the switch is present in the rendered SettingsPage
  const switchElement = screen.getByRole("switch", { name: "Single-key shortcuts" });
  expect(switchElement).toBeInTheDocument();
});
