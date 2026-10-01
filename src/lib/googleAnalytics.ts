import { isProductionAnalytics } from './analyticsEnvironment';
import {
  applyGoogleConsentMode,
  ensureGoogleConsentDefaults,
  isAnalyticsConsentGranted,
} from './cookieConsent';

/**
 * Google Tag Manager container ID. GA4 is configured inside this container
 * (no direct gtag.js), so there is a single source of truth and no double counting.
 */
export const GTM_CONTAINER_ID =
  (import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined)?.trim() || 'GTM-M6WPW8FP';

let gtmInitialized = false;

function ensureDataLayer(): void {
  window.dataLayer = window.dataLayer ?? [];
}

/**
 * Push data for GTM tags/triggers. Not consent-gated: GTM runs with Consent Mode v2,
 * so Google tags decide what they may store based on the consent state.
 */
export function pushDataLayer(data: Record<string, unknown>): void {
  if (!isProductionAnalytics() || typeof window === 'undefined') return;
  ensureDataLayer();
  window.dataLayer.push(data);
}

/**
 * Load GTM on every visit (production builds only). Consent Mode defaults are all
 * denied until the user opts in, see cookieConsent.ts.
 */
export function initGoogleTagManager(): void {
  if (
    !isProductionAnalytics() ||
    gtmInitialized ||
    typeof window === 'undefined' ||
    !GTM_CONTAINER_ID
  ) {
    return;
  }

  ensureDataLayer();
  ensureGoogleConsentDefaults();
  if (isAnalyticsConsentGranted()) applyGoogleConsentMode(true);

  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_CONTAINER_ID)}`;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_CONTAINER_ID)}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);

  gtmInitialized = true;
}

/**
 * SPA page view, call on route changes. Uses a custom event name so it does not
 * collide with GTM's built-in History Change trigger; the GA4 event tag in GTM
 * fires on `virtual_page_view`.
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  pushDataLayer({
    event: 'virtual_page_view',
    page_path: pagePath,
    page_title: pageTitle ?? document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  pushDataLayer({ event: eventName, ...params });
}

export function setAnalyticsUserId(userId: string | null): void {
  pushDataLayer({ event: 'user_id_set', user_id: userId ?? undefined });
}
