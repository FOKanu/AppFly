import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

// Test for Button keycaps aria-keyshortcuts and visibility
import { test, expect, afterEach } from "vitest";

test("renders button with aria-keyshortcuts for non-character caps", () => {
  render(
    <Button shortcut="A">Approve packet</Button>
  );

  const button = screen.getByRole("button", { name: "Approve packet" });
  expect(button).toHaveAttribute("aria-keyshortcuts", "A");

  // Verify the accessible name is correct by checking if we can find the button with that name
  // This approach avoids textContent issues with aria-hidden elements
  expect(button).toHaveTextContent("Approve packet");
});

test("converts shift shortcuts to proper format", () => {
  render(
    <Button shortcut="⇧A">Approve packet</Button>
  );

  const button = screen.getByRole("button", { name: "Approve packet" });
  expect(button).toHaveAttribute("aria-keyshortcuts", "Shift+A");
});

test("handles space-separated shortcuts by not setting aria-keyshortcuts", () => {
  render(
    <Button shortcut="G Q">Approve packet</Button>
  );

  const button = screen.getByRole("button", { name: "Approve packet" });
  expect(button).not.toHaveAttribute("aria-keyshortcuts");
});

test("hides character caps when single-key is off", () => {
  localStorage.setItem("appfly.shortcuts.single-key", "off");

  const { container } = render(
    <Button shortcut="A">Approve packet</Button>
  );

  const kbd = container.querySelector("kbd");
  expect(kbd).toBeNull();
});

afterEach(() => {
  localStorage.removeItem("appfly.shortcuts.single-key");
});
