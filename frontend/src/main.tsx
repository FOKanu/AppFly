/**
 * Purpose: Mount the React tree for the local copilot UI.
 * Inputs: `#root` in index.html.
 * Returns: None (side effect: render).
 * Does not: Read the vault or call Gemini/Apify.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
