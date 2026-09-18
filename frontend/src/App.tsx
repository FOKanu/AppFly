import { ResponsiveShell } from "./app/layout/mobile";

/**
 * Root UI. Desktop page files from other agents can replace route slots later;
 * this shell only chooses mobile vs tablet chrome.
 */
export function App() {
  return <ResponsiveShell />;
}
