/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Local Jobhunt HTTP API origin. Never a connector key. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
