import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isCharacterShortcut,
  singleKeyShortcutsOn,
  setSingleKeyShortcuts,
} from "./useShortcuts";

describe("useShortcutsGate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return true when localStorage is not set", () => {
    expect(singleKeyShortcutsOn()).toBe(true);
  });

  it("should return false when localStorage is 'off'", () => {
    localStorage.setItem("appfly.shortcuts.single-key", "off");
    expect(singleKeyShortcutsOn()).toBe(false);
  });

  it("should return true when localStorage is 'on'", () => {
    localStorage.setItem("appfly.shortcuts.single-key", "on");
    expect(singleKeyShortcutsOn()).toBe(true);
  });

  it("should handle localStorage errors gracefully", () => {
    const originalGetItem = localStorage.getItem;
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("Storage error");
    });

    expect(singleKeyShortcutsOn()).toBe(true);

    vi.spyOn(localStorage, "getItem").mockRestore();
  });

  it("should identify character shortcuts correctly", () => {
    expect(isCharacterShortcut("a")).toBe(true);
    expect(isCharacterShortcut("shift+a")).toBe(true);
    expect(isCharacterShortcut("g q")).toBe(true);
    expect(isCharacterShortcut("mod+z")).toBe(false);
    expect(isCharacterShortcut("escape")).toBe(false);
  });

  it("should update localStorage when setSingleKeyShortcuts is called", () => {
    setSingleKeyShortcuts(false);
    expect(localStorage.getItem("appfly.shortcuts.single-key")).toBe("off");

    setSingleKeyShortcuts(true);
    expect(localStorage.getItem("appfly.shortcuts.single-key")).toBe("on");
  });
});
