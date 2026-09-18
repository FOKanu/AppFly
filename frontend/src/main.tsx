import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTokens } from "./shared/ui/tokens";
import "./index.css";

/**
 * Purpose: Browser entry that mounts React onto `#root`.
 * Inputs: The `root` element in index.html.
 * Returns: Nothing; starts the tree.
 * Does not: Fetch jobs or listing URLs.
 */
const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

applyTokens();

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
