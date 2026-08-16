import Clarity from '@microsoft/clarity';
import { isProductionAnalytics } from './analyticsEnvironment';
import { isAnalyticsConsentGranted } from './cookieConsent';

/** Microsoft Clarity project ID (Settings → Overview). */
export const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID ?? 'wvjpv4zk8t';

let initialized = false;

/** Start Clarity session recording (client-only). Requires analytics cookie consent. */
export function initClarity(): void {
  if (!isProductionAnalytics() || initialized || typeof window === 'undefined') return;
  if (!CLARITY_PROJECT_ID) return;
  if (!isAnalyticsConsentGranted()) return;

  Clarity.init(CLARITY_PROJECT_ID);
  initialized = true;
}

export { Clarity };
