import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, test, expect, vi } from "vitest";
import { KeyboardPanel } from "./KeyboardPanel";

describe("KeyboardPanel", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test("renders with default on state", () => {
    render(<KeyboardPanel />);

    // Check that the switch is initially checked
    const switchElement = screen.getByRole("switch", { name: "Single-key shortcuts" });
    expect(switchElement).toBeChecked();

    // Check that ON state line is displayed
    expect(screen.getByText("On — keycaps on buttons are live.")).toBeInTheDocument();
  });

  test("toggles off when clicked", () => {
    render(<KeyboardPanel />);

    // Click the switch to turn it off
    const switchElement = screen.getByRole("switch", { name: "Single-key shortcuts" });
    fireEvent.click(switchElement);

    // Check that localStorage was updated
    expect(localStorage.getItem("appfly.shortcuts.single-key")).toBe("off");

    // Check that aria-checked is now false
    expect(switchElement).toHaveAttribute("aria-checked", "false");

    // Check that OFF state line is displayed
    expect(screen.getByText("Off — keycaps are hidden. Use the buttons.")).toBeInTheDocument();
  });

  test("does not throw when localStorage setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    render(<KeyboardPanel />);

    const switchElement = screen.getByRole("switch", { name: "Single-key shortcuts" });

    // This should not throw even though localStorage.setItem throws
    expect(() => fireEvent.click(switchElement)).not.toThrow();
  });
});
