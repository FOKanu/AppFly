/**
 * Purpose: The app version shown in the UI, read from frontend/package.json at build time.
 * Does not: expose any other package.json field (named import, tree-shaken by Vite).
 */
export { version as APP_VERSION } from "../../package.json";
