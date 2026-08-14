import { isProductionAnalytics } from './analyticsEnvironment';

/** Google Analytics 4 measurement ID */
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ?? 'G-SE22WW34C9';

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

/** Load gtag.js and configure GA4 (matches Google's recommended snippet). */
export async function initGoogleAnalytics(): Promise<void> {
  if (
    !isProductionAnalytics() ||
    gaInitialized ||
    typeof window === 'undefined' ||
    !GA_MEASUREMENT_ID
  )
    return;

  ensureDataLayer();

  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  await loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);

  gaInitialized = true;
}

/** Load GTM container when VITE_GTM_CONTAINER_ID is set. */
export function initGoogleTagManager(): void {
  if (
    !isProductionAnalytics() ||
    gtmInitialized ||
    typeof window === 'undefined' ||
    !GTM_CONTAINER_ID
  )
    return;

  ensureDataLayer();
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

/** SPA page view , use on route changes. */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (!isProductionAnalytics() || typeof window === 'undefined') return;

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
    });
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isProductionAnalytics()) return;
  pushDataLayer({ event: eventName, ...params });
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

export function setAnalyticsUserId(userId: string | null): void {
  if (!isProductionAnalytics() || !window.gtag || !GA_MEASUREMENT_ID) return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId ?? undefined,
  });
  pushDataLayer({
    event: 'user_id_set',
    user_id: userId ?? undefined,
  });
}
