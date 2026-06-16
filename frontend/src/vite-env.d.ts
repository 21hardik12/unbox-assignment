/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEVICE_ID?: string;
  readonly VITE_MAX_SPEED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
