import Clarity from '@microsoft/clarity';

/** Microsoft Clarity project ID (Settings → Overview). */
export const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID ?? 'wvjpv4zk8t';

let initialized = false;

/** Start Clarity session recording (client-only, safe to call once). */
export function initClarity(): void {
  if (initialized || typeof window === 'undefined') return;
  if (!CLARITY_PROJECT_ID) return;

  Clarity.init(CLARITY_PROJECT_ID);
  initialized = true;
}

export { Clarity };
