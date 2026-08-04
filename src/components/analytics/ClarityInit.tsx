import { useEffect } from 'react';
import { isProductionAnalytics } from '../../lib/analyticsEnvironment';
import { initClarity } from '../../lib/clarity';

/** Initializes Microsoft Clarity once on the client (production builds only). */
export function ClarityInit() {
  const enabled = isProductionAnalytics();

  useEffect(() => {
    if (!enabled) return;
    initClarity();
  }, [enabled]);

  return null;
}
