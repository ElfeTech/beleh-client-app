import type { BillingCycle } from './billingCatalog';

export interface PricingIntent {
  planId: string;
  cycle: BillingCycle;
  /** When true, resume Stripe checkout after auth (if needed). */
  checkout: boolean;
}

export function buildPricingIntentUrl(intent: {
  planId: string;
  cycle: BillingCycle;
  checkout?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set('plan', intent.planId);
  params.set('cycle', intent.cycle);
  if (intent.checkout) params.set('checkout', '1');
  return `/pricing?${params.toString()}`;
}

export function parsePricingIntent(search: string): PricingIntent | null {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const planId = params.get('plan')?.trim();
  if (!planId) return null;

  const cycleRaw = params.get('cycle')?.trim().toLowerCase();
  const cycle: BillingCycle =
    cycleRaw === 'yearly' || cycleRaw === 'year' ? 'yearly' : 'monthly';

  return {
    planId,
    cycle,
    checkout: params.get('checkout') === '1',
  };
}

export function signUpPathWithPricingIntent(intent: PricingIntent): string {
  const next = buildPricingIntentUrl({ ...intent, checkout: true });
  return `/signup?next=${encodeURIComponent(next)}`;
}

export function signInPathWithPricingIntent(intent: PricingIntent): string {
  const next = buildPricingIntentUrl({ ...intent, checkout: true });
  return `/signin?next=${encodeURIComponent(next)}`;
}
