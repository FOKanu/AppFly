import { useCallback, useEffect, useRef, useState } from "react";

interface UseMenuResult {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  close: () => void;
  /** Put on the element that opens the menu. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** Put on the menu container. */
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** Index of the item that currently holds focus, for roving tabindex. */
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Register each enabled item so arrow keys can walk them in order. */
  registerItem: (index: number, element: HTMLElement | null) => void;
  /** Spread onto the menu container to get arrow / Home / End / Esc handling. */
  menuKeyDown: (event: React.KeyboardEvent) => void;
  /** Spread onto the trigger for Enter / Space / ArrowDown. */
  triggerKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Purpose: Menu behaviour shared by every dropdown — open state, click-outside,
 *          Escape, and a roving tabindex across the enabled items.
 * Inputs: Nothing; the caller owns what the items are.
 * Returns: Refs, handlers and the active index to drive `tabIndex`.
 * Does not: render anything, or decide what an item does when chosen.
 */
export function useMenu(): UseMenuResult {
  const [open, setOpenState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);

  const registerItem = useCallback((index: number, element: HTMLElement | null) => {
    itemsRef.current[index] = element;
  }, []);

  const close = useCallback(() => {
    setOpenState(false);
    setActiveIndex(0);
    // Return focus to the trigger so keyboard users are not dropped at the
    // top of the document.
    triggerRef.current?.focus();
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (next) setActiveIndex(0);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((current) => {
      if (current) triggerRef.current?.focus();
      return !current;
    });
    setActiveIndex(0);
  }, []);

  // Close on a click anywhere outside the trigger or the menu.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpenState(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move DOM focus to whichever item is active.
  useEffect(() => {
    if (!open) return;
    itemsRef.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const step = useCallback((delta: number) => {
    const items = itemsRef.current;
    const usable = items
      .map((element, index) => ({ element, index }))
      .filter((entry) => entry.element && !entry.element.hasAttribute("disabled"));
    if (usable.length === 0) return;
    setActiveIndex((current) => {
      const position = usable.findIndex((entry) => entry.index === current);
      const nextPosition =
        position < 0
          ? 0
          : (position + delta + usable.length) % usable.length;
      return usable[nextPosition].index;
    });
  }, []);

  const menuKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          close();
          break;
        case "ArrowDown":
          event.preventDefault();
          step(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          step(-1);
          break;
        case "Home":
          event.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          event.preventDefault();
          setActiveIndex(itemsRef.current.length - 1);
          break;
        case "Tab":
          // A menu is a single stop; tabbing away dismisses it.
          setOpenState(false);
          break;
        default:
          break;
      }
    },
    [close, step],
  );

  const triggerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
      }
    },
    [setOpen],
  );

  return {
    open,
    setOpen,
    toggle,
    close,
    triggerRef,
    menuRef,
    activeIndex,
    setActiveIndex,
    registerItem,
    menuKeyDown,
    triggerKeyDown,
  };
}
