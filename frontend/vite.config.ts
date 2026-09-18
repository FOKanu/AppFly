/**
 * Purpose: Vite bundler config for the local React app.
 * Inputs: None (static config).
 * Returns: Vite UserConfig.
 * Does not: Proxy the Obsidian vault or inject API keys.
 */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
