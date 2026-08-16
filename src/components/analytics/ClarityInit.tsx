import { useEffect, useState } from 'react';
import { isProductionAnalytics } from '../../lib/analyticsEnvironment';
import { isAnalyticsConsentGranted, subscribeCookieConsent } from '../../lib/cookieConsent';
import { initClarity } from '../../lib/clarity';

/** Initializes Microsoft Clarity once after analytics cookie consent (production only). */
export function ClarityInit() {
  const enabled = isProductionAnalytics();
  const [analyticsAllowed, setAnalyticsAllowed] = useState(() => isAnalyticsConsentGranted());

  useEffect(() => {
    if (!enabled) return;
    setAnalyticsAllowed(isAnalyticsConsentGranted());
    return subscribeCookieConsent((state) => {
      setAnalyticsAllowed(state?.categories.analytics === true);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !analyticsAllowed) return;
    initClarity();
  }, [enabled, analyticsAllowed]);

  return null;
}
