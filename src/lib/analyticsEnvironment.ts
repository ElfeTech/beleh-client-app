/**
 * Analytics (GA4, GTM, Clarity) run only on production builds (`vite build`).
 * Disabled during `vite dev` and other non-production modes.
 */
export function isProductionAnalytics(): boolean {
  return import.meta.env.PROD;
}
