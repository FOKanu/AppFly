import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/** Vite + Vitest config. Only `VITE_API_BASE_URL` is a supported env prefix usage. */
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_"],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    restoreMocks: true,
  },
});
