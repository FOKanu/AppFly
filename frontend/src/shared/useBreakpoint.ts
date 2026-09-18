import { useEffect, useState } from "react";
import {
  BREAKPOINT_MIN_WIDTH,
  breakpointFromWidth,
  type Breakpoint,
} from "./breakpoint";

/** Live viewport classification for sparse layout switches. */
export type BreakpointState = {
  width: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

function readWidth(): number {
  if (typeof window === "undefined") return BREAKPOINT_MIN_WIDTH.desktop;
  return window.innerWidth;
}

/**
 * Subscribe to viewport width and return FigJam mobile / tablet / desktop.
 * Keep call sites rare — prefer CSS — so desktop pages stay untouched.
 */
export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(readWidth);

  useEffect(() => {
    const onResize = () => setWidth(readWidth());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const breakpoint = breakpointFromWidth(width);
  return {
    width,
    breakpoint,
    isMobile: breakpoint === "mobile",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
  };
}
