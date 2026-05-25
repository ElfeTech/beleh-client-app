import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isProductionAnalytics } from '../../lib/analyticsEnvironment';
import {
  initGoogleAnalytics,
  initGoogleTagManager,
  trackPageView,
} from '../../lib/googleAnalytics';

/**
 * Loads GA4 (gtag.js), optional GTM container, and tracks SPA route changes.
 * Active only on production builds (`import.meta.env.PROD`).
 */
export function GoogleAnalyticsInit() {
  const { pathname, search } = useLocation();
  const enabled = isProductionAnalytics();

  useEffect(() => {
    if (!enabled) return;
    void initGoogleAnalytics();
    initGoogleTagManager();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    trackPageView(pathname + search);
  }, [pathname, search, enabled]);

  return null;
}
