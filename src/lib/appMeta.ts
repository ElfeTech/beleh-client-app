/** Injected at build time from package.json (see vite.config.ts). */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION;

/** UTC build stamp (YYYY.MM.DD), set at build time. */
export const APP_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID;

export function formatAppVersionLabel(): string {
  return `v${APP_VERSION}`;
}
