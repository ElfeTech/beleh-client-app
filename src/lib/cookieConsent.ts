/** Cookie / analytics consent — gates GA4, GTM, and Clarity. */

export const COOKIE_CONSENT_STORAGE_KEY = 'beleh.cookie-consent.v1';
export const COOKIE_CONSENT_EVENT = 'beleh:cookie-consent-changed';
export const COOKIE_CONSENT_OPEN_EVENT = 'beleh:cookie-consent-open';

export type CookieConsentCategories = {
  /** Always true — auth, security, load balancing. */
  necessary: true;
  /** Theme, sidebar, UI memory preferences. */
  preferences: boolean;
  /** Google Analytics, GTM, Microsoft Clarity. */
  analytics: boolean;
};

export type CookieConsentState = {
  version: 1;
  updatedAt: string;
  categories: CookieConsentCategories;
};

const DEFAULT_DENIED: CookieConsentCategories = {
  necessary: true,
  preferences: true,
  analytics: false,
};

function isConsentState(value: unknown): value is CookieConsentState {
  if (!value || typeof value !== 'object') return false;
  const v = value as CookieConsentState;
  return (
    v.version === 1 &&
    typeof v.updatedAt === 'string' &&
    !!v.categories &&
    v.categories.necessary === true &&
    typeof v.categories.preferences === 'boolean' &&
    typeof v.categories.analytics === 'boolean'
  );
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasCookieConsentChoice(): boolean {
  return readCookieConsent() != null;
}

export function isAnalyticsConsentGranted(): boolean {
  return readCookieConsent()?.categories.analytics === true;
}

function emitConsentChanged(state: CookieConsentState): void {
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: state }));
}

export function writeCookieConsent(
  categories: Omit<CookieConsentCategories, 'necessary'> & { necessary?: true },
): CookieConsentState {
  const state: CookieConsentState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    categories: {
      necessary: true,
      preferences: categories.preferences,
      analytics: categories.analytics,
    },
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));
  applyGoogleConsentMode(state.categories.analytics);
  emitConsentChanged(state);
  return state;
}

export function acceptAllCookies(): CookieConsentState {
  return writeCookieConsent({ preferences: true, analytics: true });
}

export function rejectNonEssentialCookies(): CookieConsentState {
  return writeCookieConsent({ preferences: true, analytics: false });
}

/** Open the banner/preferences UI from footer links, etc. */
export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
}

export function subscribeCookieConsent(listener: (state: CookieConsentState | null) => void): () => void {
  const onChange = (e: Event) => {
    const detail = (e as CustomEvent<CookieConsentState>).detail;
    listener(detail ?? readCookieConsent());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === COOKIE_CONSENT_STORAGE_KEY) listener(readCookieConsent());
  };
  window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function subscribeCookieConsentOpen(listener: () => void): () => void {
  window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, listener);
  return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, listener);
}

/**
 * Official gtag.js stub. Commands must be pushed as an Arguments object.
 * Rest-parameter arrays (`push(args)`) are ignored by gtag.js, so GA never
 * receives config/consent/page_view — Clarity is unaffected because it uses its own SDK.
 */
export function ensureGtagQueue(): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag === 'function') return;
  window.gtag = function gtag() {
    // Google's snippet: dataLayer.push(arguments) — not an array of args.
    // eslint-disable-next-line prefer-rest-params -- required for gtag.js
    window.dataLayer.push(arguments);
  };
}

let consentDefaultsSent = false;

/**
 * Google Consent Mode v2 defaults — call before loading gtag.js.
 * Analytics/ads stay denied until the user opts in.
 */
export function ensureGoogleConsentDefaults(): void {
  if (typeof window === 'undefined' || consentDefaultsSent) return;
  ensureGtagQueue();
  window.gtag?.('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });
  consentDefaultsSent = true;
}

export function applyGoogleConsentMode(analyticsGranted: boolean): void {
  if (typeof window === 'undefined') return;
  ensureGtagQueue();
  const value = analyticsGranted ? 'granted' : 'denied';
  window.gtag?.('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: value,
  });
}

export function getDefaultDeniedCategories(): CookieConsentCategories {
  return { ...DEFAULT_DENIED };
}
