/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Local API origin. Never holds connector keys. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
