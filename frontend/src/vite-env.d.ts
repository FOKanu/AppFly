/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Local Jobhunt API origin. The only VITE_* variable this app may use. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
