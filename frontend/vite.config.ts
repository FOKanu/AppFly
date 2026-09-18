import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Purpose: Vite + Vitest config for the Jobhunt Copilot UI.
 * Does not: proxy deny-listed job boards or inject API keys.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/health": "http://127.0.0.1:8787",
      "/jobs": "http://127.0.0.1:8787",
      "/runs": "http://127.0.0.1:8787",
      "/settings": "http://127.0.0.1:8787",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
