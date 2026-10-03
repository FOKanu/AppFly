import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useShortcuts, type ShortcutMap } from "./useShortcuts";

function Probe({ map, enabled = true }: { map: ShortcutMap; enabled?: boolean }) {
  useShortcuts(map, enabled);
  return (
    <div>
      <input type="text" aria-label="text" />
      <textarea aria-label="area" />
      <input type="checkbox" aria-label="pick" />
    </div>
  );
}

describe("useShortcuts", () => {
  it("calls the handler for a plain key", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    await userEvent.keyboard("{a}");
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("Shift+A does not trigger a", async () => {
    const mockHandler = vi.fn();
    const shiftA = vi.fn();
    render(<Probe map={{ a: mockHandler, "shift+a": shiftA }} />);
    await userEvent.keyboard("{Shift>}{a}{/Shift}");
    expect(shiftA).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores keys typed into a text input", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    const input = screen.getByLabelText("text");
    input.focus();
    await userEvent.keyboard("{a}");
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores keys typed into a textarea", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    const textarea = screen.getByLabelText("area");
    textarea.focus();
    await userEvent.keyboard("{a}");
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("still fires when a checkbox has focus", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ "shift+a": mockHandler }} />);
    const checkbox = screen.getByLabelText("pick");
    checkbox.focus();
    await userEvent.keyboard("{Shift>}{a}{/Shift}");
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("runs a two-key sequence g then q", async () => {
    const go = vi.fn();
    render(<Probe map={{ "g q": go }} />);
    await userEvent.keyboard("{g}");
    await userEvent.keyboard("{q}");
    expect(go).toHaveBeenCalledTimes(1);
  });

  it("q alone does not run g q", async () => {
    const go = vi.fn();
    render(<Probe map={{ "g q": go }} />);
    await userEvent.keyboard("{q}");
    expect(go).toHaveBeenCalledTimes(0);
  });

  it("does nothing while disabled", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} enabled={false} />);
    await userEvent.keyboard("{a}");
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("stops listening after unmount", async () => {
    const mockHandler = vi.fn();
    const { unmount } = render(<Probe map={{ a: mockHandler }} />);
    unmount();
    await userEvent.keyboard("{a}");
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("leaves unmapped keys alone", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});
