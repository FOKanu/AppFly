import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Purpose: Vite bundler config for the instrument-panel UI.
 * Inputs: None (static config).
 * Returns: Vite config with the React plugin.
 * Does not: Proxy crawl requests to deny-listed job boards.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
