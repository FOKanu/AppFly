import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Where a portalled menu should be painted, in viewport coordinates. */
export interface MenuPosition {
  left: number;
  top: number;
  /** Max height available before the menu would leave the viewport. */
  maxHeight: number;
  /** True when the menu had to open upward. */
  flipped: boolean;
}

interface UseMenuOptions {
  /** Menu width, used to keep it inside the viewport. */
  width?: number;
  /** Gap between the trigger and the menu. */
  offset?: number;
}

interface UseMenuResult {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  close: () => void;
  /** Put on the element that opens the menu. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** Put on the menu container. */
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** Viewport coordinates for a portalled menu. */
  position: MenuPosition;
  /** Index of the item that currently holds focus, for roving tabindex. */
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Register each item so arrow keys can walk them in order. */
  registerItem: (index: number, element: HTMLElement | null) => void;
  /** Spread onto the menu container for arrow / Home / End / Esc handling. */
  menuKeyDown: (event: React.KeyboardEvent) => void;
  /** Spread onto the trigger for Enter / Space / ArrowDown. */
  triggerKeyDown: (event: React.KeyboardEvent) => void;
}

/** Keep this much clear space between the menu and the viewport edge. */
const VIEWPORT_MARGIN = 8;

/**
 * Purpose: Find the closest ancestor that actually scrolls.
 * Does not: assume a class name, so the hook stays independent of the markup.
 */
function nearestScrollable(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from.parentElement;
  while (node) {
    if (node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Purpose: Menu behaviour shared by every dropdown — open state, click-outside,
 *          Escape, a roving tabindex, and viewport-aware anchor positioning for
 *          menus rendered through a portal.
 * Inputs: Optional width/offset used only for positioning.
 * Returns: Refs, handlers, the active index, and where to paint the menu.
 * Does not: render anything, or decide what an item does when chosen.
 */
export function useMenu({ width = 280, offset = 8 }: UseMenuOptions = {}): UseMenuResult {
  const [open, setOpenState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition>({
    left: 0,
    top: 0,
    maxHeight: 0,
    flipped: false,
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<(HTMLElement | null)[]>([]);
  /** True for the first focus after opening, so we do not scroll the list. */
  const openingRef = useRef(false);

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
    if (next) openingRef.current = true;
    setOpenState(next);
    if (next) setActiveIndex(0);
  }, []);

  const toggle = useCallback(() => {
    openingRef.current = true;
    setOpenState((current) => !current);
    setActiveIndex(0);
  }, []);

  /**
   * Anchor under the trigger, flipping above it when the space below is too
   * tight, and clamping so the menu never leaves the viewport.
   */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - offset - VIEWPORT_MARGIN;
    const above = rect.top - offset - VIEWPORT_MARGIN;
    const flipped = below < 280 && above > below;

    setPosition({
      left: Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left),
        window.innerWidth - width - VIEWPORT_MARGIN,
      ),
      top: flipped ? Math.max(VIEWPORT_MARGIN, rect.top - offset) : rect.bottom + offset,
      maxHeight: Math.max(160, flipped ? above : below),
      flipped,
    });
  }, [offset, width]);

  // Measure before paint so the menu never flashes in the wrong place.
  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  // Follow the trigger if the page moves under it.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

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

  /*
   * Move DOM focus to whichever item is active. On the very first focus after
   * opening we suppress scrolling and pin the list to the top — otherwise
   * focusing item 0 nudges the list and hides the first section label.
   */
  useEffect(() => {
    if (!open) return;
    const element = itemsRef.current[activeIndex];
    if (!element) return;
    if (openingRef.current) {
      openingRef.current = false;
      element.focus({ preventScroll: true });
      const scroller = nearestScrollable(element);
      if (scroller) scroller.scrollTop = 0;
      return;
    }
    element.focus();
  }, [open, activeIndex]);

  const step = useCallback((delta: number) => {
    const items = itemsRef.current;
    const usable = items
      .map((element, index) => ({ element, index }))
      .filter((entry) => entry.element && !entry.element.hasAttribute("disabled"));
    if (usable.length === 0) return;
    setActiveIndex((current) => {
      const position = usable.findIndex((entry) => entry.index === current);
      const nextPosition = position < 0 ? 0 : (position + delta + usable.length) % usable.length;
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
    position,
    activeIndex,
    setActiveIndex,
    registerItem,
    menuKeyDown,
    triggerKeyDown,
  };
}
