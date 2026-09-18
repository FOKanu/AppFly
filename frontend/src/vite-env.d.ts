/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional local API origin. Empty means same-origin `/jobs`. Never an API key. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
