/**
 * Purpose: Page-level keyboard shortcuts that back the on-screen keycaps (A, D, E, ⇧A, ⇧D, Esc, "G Q", ⌘Z).
 * Does not: own ⌘K or R (AppShell does), or fire while the person types in a text field or works inside an open dialog or menu.
 * Note: Character shortcuts can be turned off in Settings → Keyboard.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";

export type ShortcutMap = Partial<Record<string, () => void>>;

/** Second key of a two-key sequence ("g q") must follow within this many ms. */
export const SEQUENCE_MS = 1000;

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset"]);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true" || target.getAttribute("contenteditable") === "") return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return false;
}

/** True inside an open overlay (dialog sheet, menu, listbox), or an expanded popup trigger (with aria-haspopup or aria-controls), where page keys must not act on the page behind. */
export function isInOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('[role="dialog"], [role="menu"], [role="listbox"], [aria-modal="true"], [aria-expanded="true"][aria-haspopup], [aria-expanded="true"][aria-controls]') !== null;
}

export function shortcutKey(event: KeyboardEvent): string | null {
  if (event.altKey) return null;
  let base: string;
  if (event.key === "Escape") base = "escape";
  else if (event.key.length === 1) base = event.key.toLowerCase();
  else return null;
  if (event.metaKey || event.ctrlKey) return event.shiftKey ? null : `mod+${base}`;
  return event.shiftKey ? `shift+${base}` : base;
}

export const SINGLE_KEY_STORAGE_KEY = "appfly.shortcuts.single-key";

export function singleKeyShortcutsOn(): boolean {
  try {
    return localStorage.getItem(SINGLE_KEY_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSingleKeyShortcuts(on: boolean): void {
  try {
    localStorage.setItem(SINGLE_KEY_STORAGE_KEY, on ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event("appfly:shortcuts"));
}

export function useSingleKeyShortcuts(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const handleStorage = () => onStoreChange();
      const handleAppflyShortcuts = () => onStoreChange();
      window.addEventListener("storage", handleStorage);
      window.addEventListener("appfly:shortcuts", handleAppflyShortcuts);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("appfly:shortcuts", handleAppflyShortcuts);
      };
    },
    singleKeyShortcutsOn,
    singleKeyShortcutsOn,
  );
}

export function isCharacterShortcut(key: string): boolean {
  const firstPart = key.split(" ")[0];
  return firstPart !== "escape" && !firstPart.startsWith("mod+");
}

export function useShortcuts(map: ShortcutMap, enabled = true): void {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    let pending: { key: string; at: number } | null = null;
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (isTypingTarget(event.target) || isInOverlay(event.target)) return;
      const key = shortcutKey(event);
      if (!key) return;

      // Gate character shortcuts
      if (isCharacterShortcut(key) && !singleKeyShortcutsOn()) {
        pending = null;
        return;
      }

      const handlers = mapRef.current;
      const now = Date.now();
      if (pending && now - pending.at <= SEQUENCE_MS) {
        const sequence = handlers[`${pending.key} ${key}`];
        pending = null;
        if (sequence) {
          event.preventDefault();
          sequence();
          return;
        }
      }
      pending = null;
      const handler = handlers[key];
      if (handler) {
        event.preventDefault();
        handler();
        return;
      }
      if (Object.keys(handlers).some((name) => name.startsWith(`${key} `))) {
        pending = { key, at: now };
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
