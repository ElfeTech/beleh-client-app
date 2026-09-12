import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isProductionAnalytics } from '../../lib/analyticsEnvironment';
import {
  ensureGoogleConsentDefaults,
  isAnalyticsConsentGranted,
  readCookieConsent,
  subscribeCookieConsent,
} from '../../lib/cookieConsent';
import {
  initGoogleAnalytics,
  initGoogleTagManager,
  trackPageView,
} from '../../lib/googleAnalytics';

/**
 * Loads GA4 (gtag.js), optional GTM container, and tracks SPA route changes
 * only after the user grants analytics cookie consent (production builds).
 */
export function GoogleAnalyticsInit() {
  const { pathname, search } = useLocation();
  const enabled = isProductionAnalytics();
  const [analyticsAllowed, setAnalyticsAllowed] = useState(() => isAnalyticsConsentGranted());
  const [gaReady, setGaReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    ensureGoogleConsentDefaults();
    setAnalyticsAllowed(isAnalyticsConsentGranted());
    return subscribeCookieConsent((state) => {
      setAnalyticsAllowed(state?.categories.analytics === true);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !analyticsAllowed) {
      setGaReady(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      await initGoogleAnalytics();
      initGoogleTagManager();
      if (!cancelled) setGaReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, analyticsAllowed]);

  useEffect(() => {
    if (!gaReady || !readCookieConsent()?.categories.analytics) return;
    trackPageView(pathname + search);
  }, [pathname, search, gaReady]);

  return null;
}
