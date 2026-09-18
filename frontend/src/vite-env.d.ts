/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the local Jobhunt API. Never put API keys here. */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
