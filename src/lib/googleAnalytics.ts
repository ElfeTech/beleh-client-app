import { isProductionAnalytics } from './analyticsEnvironment';
import {
  applyGoogleConsentMode,
  ensureGoogleConsentDefaults,
  ensureGtagQueue,
  isAnalyticsConsentGranted,
} from './cookieConsent';

/** Google Analytics 4 measurement ID */
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || 'G-SE22WW34C9';

/** Google Tag Manager container ID (e.g. GTM-XXXXXXX). Leave unset until you have a container. */
export const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID ?? '';

let gaInitialized = false;
let gtmInitialized = false;

function ensureDataLayer(): void {
  window.dataLayer = window.dataLayer ?? [];
}

/** Push arbitrary data for GTM tags/triggers (call from app code or custom events). */
export function pushDataLayer(data: Record<string, unknown>): void {
  if (!isProductionAnalytics() || typeof window === 'undefined') return;
  if (!isAnalyticsConsentGranted()) return;
  ensureDataLayer();
  window.dataLayer.push(data);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/** Load gtag.js and configure GA4. Requires analytics cookie consent. */
export async function initGoogleAnalytics(): Promise<void> {
  if (
    !isProductionAnalytics() ||
    gaInitialized ||
    typeof window === 'undefined' ||
    !GA_MEASUREMENT_ID ||
    !isAnalyticsConsentGranted()
  )
    return;

  ensureGtagQueue();
  ensureGoogleConsentDefaults();
  applyGoogleConsentMode(true);

  window.gtag?.('js', new Date());
  window.gtag?.('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  try {
    await loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    gaInitialized = true;
  } catch (error) {
    console.warn('[GA] Failed to load gtag.js', error);
  }
}

/** Load GTM container when VITE_GTM_CONTAINER_ID is set. Requires analytics consent. */
export function initGoogleTagManager(): void {
  if (
    !isProductionAnalytics() ||
    gtmInitialized ||
    typeof window === 'undefined' ||
    !GTM_CONTAINER_ID ||
    !isAnalyticsConsentGranted()
  )
    return;

  ensureDataLayer();
  ensureGoogleConsentDefaults();
  applyGoogleConsentMode(true);
  pushDataLayer({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);

  gtmInitialized = true;
}

/** SPA page view — use on route changes. */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isProductionAnalytics() || typeof window === 'undefined') return;
  if (!isAnalyticsConsentGranted()) return;

  const title = pageTitle ?? document.title;

  pushDataLayer({
    event: 'page_view',
    page_path: pagePath,
    page_title: title,
  });

  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: title,
      page_location: window.location.href,
    });
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isProductionAnalytics() || !isAnalyticsConsentGranted()) return;
  pushDataLayer({ event: eventName, ...params });
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

export function setAnalyticsUserId(userId: string | null): void {
  if (
    !isProductionAnalytics() ||
    !isAnalyticsConsentGranted() ||
    !window.gtag ||
    !GA_MEASUREMENT_ID
  )
    return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId ?? undefined,
  });
  pushDataLayer({
    event: 'user_id_set',
    user_id: userId ?? undefined,
  });
}
