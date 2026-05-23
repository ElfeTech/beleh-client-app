import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  initGoogleAnalytics,
  initGoogleTagManager,
  trackPageView,
} from '../../lib/googleAnalytics';

/**
 * Loads GA4 (gtag.js), optional GTM container, and tracks SPA route changes.
 */
export function GoogleAnalyticsInit() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    void initGoogleAnalytics();
    initGoogleTagManager();
  }, []);

  useEffect(() => {
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
}
