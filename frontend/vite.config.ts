import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/** Vite + Vitest config for the AppFly copilot UI. */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
