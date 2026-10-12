import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useShortcuts, type ShortcutMap } from "./useShortcuts";

function Probe({ map, enabled = true }: { map: ShortcutMap; enabled?: boolean }) {
  useShortcuts(map, enabled);
  return (
    <div>
      <input type="text" aria-label="text" />
      <textarea aria-label="area" />
      <input type="checkbox" aria-label="pick" />
      <select aria-label="choose">
        <option>x</option>
      </select>
      <div contentEditable aria-label="rich" />
      <div role="dialog" aria-label="sheet">
        <button type="button">in dialog</button>
      </div>
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

  it("ignores keys inside a dialog", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    fireEvent.keyDown(screen.getByText("in dialog"), { key: "a" });
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores keys in a select", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    fireEvent.keyDown(screen.getByLabelText("choose"), { key: "a" });
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores keys in contentEditable", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    fireEvent.keyDown(screen.getByLabelText("rich"), { key: "a" });
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores auto-repeat", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    fireEvent.keyDown(window, { key: "a", repeat: true });
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores Alt", async () => {
    const mockHandler = vi.fn();
    render(<Probe map={{ a: mockHandler }} />);
    fireEvent.keyDown(window, { key: "a", altKey: true });
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("ignores keys on an expanded popup trigger", async () => {
    const mockHandler = vi.fn();
    render(
      <div>
        <button type="button" aria-haspopup="menu" aria-expanded="true">trigger</button>
        <Probe map={{ a: mockHandler }} />
      </div>
    );
    fireEvent.keyDown(screen.getByText("trigger"), { key: "a" });
    expect(mockHandler).toHaveBeenCalledTimes(0);
  });

  it("allows keys on a collapsed popup trigger", async () => {
    const mockHandler = vi.fn();
    render(
      <div>
        <button type="button" aria-haspopup="menu" aria-expanded="false">trigger</button>
        <Probe map={{ a: mockHandler }} />
      </div>
    );
    fireEvent.keyDown(screen.getByText("trigger"), { key: "a" });
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("mod+z fires for Cmd+Z but not Cmd+Shift+Z", async () => {
    const undo = vi.fn();
    render(<Probe map={{ "mod+z": undo }} />);
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("g q expires after SEQUENCE_MS", async () => {
    const go = vi.fn();
    render(<Probe map={{ "g q": go }} />);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      fireEvent.keyDown(window, { key: "g" });
      vi.setSystemTime(1001);
      fireEvent.keyDown(window, { key: "q" });
      expect(go).toHaveBeenCalledTimes(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
