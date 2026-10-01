import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isProductionAnalytics } from '../../lib/analyticsEnvironment';
import { captureAttribution } from '../../lib/attribution';
import { applyGoogleConsentMode, subscribeCookieConsent } from '../../lib/cookieConsent';
import { initGoogleTagManager, pushDataLayer, trackPageView } from '../../lib/googleAnalytics';

/**
 * Loads Google Tag Manager on every visit (production builds) with Consent Mode v2
 * defaults denied, forwards consent changes, captures UTM attribution, and pushes
 * SPA route changes to the dataLayer. GA4 itself is configured inside GTM.
 */
export function GoogleAnalyticsInit() {
  const { pathname, search } = useLocation();
  const enabled = isProductionAnalytics();

  useEffect(() => {
    if (!enabled) return;
    const attribution = captureAttribution();
    initGoogleTagManager();
    if (attribution) pushDataLayer({ event: 'utm_captured', ...attribution });
    return subscribeCookieConsent((state) => {
      applyGoogleConsentMode(state?.categories.analytics === true);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    trackPageView(pathname + search);
  }, [enabled, pathname, search]);

  return null;
}
