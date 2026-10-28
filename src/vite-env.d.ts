/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRANKIE_KEY?: string;
  readonly VITE_FRANKIE_KEY_SUPPORT?: string;
  readonly VITE_FRANKIE_KEY_DOCS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
