import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Purpose: Unit/component test runner for the instrument-panel UI (F3).
 * Does not: Hit the live API or crawl job boards.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
});
