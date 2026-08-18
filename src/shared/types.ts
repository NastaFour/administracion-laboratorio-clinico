/**
 * Renderer-facing API exposed through the Electron preload script.
 * WU1 starts with an empty allowlist; WU2 adds typed domain methods.
 */
export type LabCoreAPI = Record<string, never>

declare global {
  interface Window {
    api: LabCoreAPI
  }
}
