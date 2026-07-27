import type { BillingCatalogPlan, BillingPrice, BillingPriceInterval } from '../types/billing';
import type { Plan } from '../types/usage';

export type BillingCycle = 'monthly' | 'yearly';

/** Normalize Stripe/API interval strings to catalog intervals. */
export function normalizeInterval(raw: string | null | undefined): BillingPriceInterval | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v === 'month' || v === 'monthly' || v === 'm') return 'month';
  if (v === 'year' || v === 'yearly' || v === 'annual' || v === 'annually' || v === 'y') {
    return 'year';
  }
  if (v === 'week' || v === 'weekly') return 'week';
  if (v === 'day' || v === 'daily') return 'day';
  return null;
}

function coerceAmount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Percent saved off the compare-at price, or null when there is no real discount. */
export function computeDiscountPercent(
  compareAt: number | null | undefined,
  unitAmount: number | null | undefined,
): number | null {
  const compare = coerceAmount(compareAt);
  const unit = coerceAmount(unitAmount);
  if (compare == null || unit == null) return null;
  if (compare <= 0 || unit < 0 || compare <= unit) return null;
  const percent = Math.round(((compare - unit) / compare) * 100);
  return percent > 0 ? percent : null;
}

function matchUsagePlan(plan: BillingCatalogPlan, usagePlans: Plan[]): Plan | undefined {
  return usagePlans.find(
    (p) =>
      p.id === plan.plan_id ||
      p.id === String(plan.plan_id) ||
      p.tier.toLowerCase() === plan.tier.toLowerCase(),
  );
}

function amountFromUsage(usage: Plan | undefined, interval: BillingPriceInterval): number | null {
  if (!usage) return null;
  if (interval === 'year') return coerceAmount(usage.price_yearly);
  if (interval === 'month') return coerceAmount(usage.price_monthly);
  return null;
}

function compareAtFromUsage(
  usage: Plan | undefined,
  interval: BillingPriceInterval,
): number | null {
  if (!usage) return null;
  if (interval === 'year') return coerceAmount(usage.compare_at_price_yearly);
  if (interval === 'month') return coerceAmount(usage.compare_at_price_monthly);
  return null;
}

function buildPrice(
  interval: BillingPriceInterval,
  unitAmount: number | null,
  compareAt: number | null,
  currency: string,
  stripePriceId: string,
  serverDiscountPercent?: number | null,
): BillingPrice {
  const unit = unitAmount ?? 0;
  // A compare-at price is only meaningful when it beats the charged amount.
  const derived = computeDiscountPercent(compareAt, unit);
  const serverPercent = coerceAmount(serverDiscountPercent);
  let percent: number | null = null;
  if (derived != null) {
    percent = serverPercent != null && serverPercent > 0 ? serverPercent : derived;
  }
  return {
    stripe_price_id: stripePriceId,
    interval,
    unit_amount: unit,
    compare_at_amount: percent != null ? compareAt : null,
    discount_percent: percent,
    currency: (currency || 'usd').toLowerCase(),
  };
}

/**
 * Catalog prices only exist when Stripe Price IDs are linked; unit_amount may be null
 * if DB amounts were not synced. Fill amounts, compare-at prices, and discounts from
 * /api/usage/plans so pricing always reflects the database.
 */
export function enrichCatalogPlans(
  catalogPlans: BillingCatalogPlan[],
  usagePlans: Plan[],
): BillingCatalogPlan[] {
  return catalogPlans.map((plan) => {
    const usage = matchUsagePlan(plan, usagePlans);
    const byInterval = new Map<BillingPriceInterval, BillingPrice>();

    for (const raw of plan.prices ?? []) {
      const interval = normalizeInterval(raw.interval) ?? (raw.interval as BillingPriceInterval);
      let unitAmount = coerceAmount(raw.unit_amount);
      if (unitAmount == null || unitAmount === 0) {
        unitAmount = amountFromUsage(usage, interval) ?? unitAmount ?? 0;
      }
      const compareAt = coerceAmount(raw.compare_at_amount) ?? compareAtFromUsage(usage, interval);
      byInterval.set(
        interval,
        buildPrice(
          interval,
          unitAmount,
          compareAt,
          raw.currency,
          raw.stripe_price_id,
          raw.discount_percent,
        ),
      );
    }

    // DB has amounts but no Stripe-linked prices yet — still show configured pricing.
    if (usage) {
      for (const interval of ['month', 'year'] as const) {
        if (byInterval.has(interval)) continue;
        const amount = amountFromUsage(usage, interval);
        if (amount == null || amount <= 0) continue;
        byInterval.set(
          interval,
          buildPrice(interval, amount, compareAtFromUsage(usage, interval), 'usd', ''),
        );
      }
    }

    const prices = [...byInterval.values()];
    const hasDiscount = prices.some((p) => (p.discount_percent ?? 0) > 0);
    return {
      ...plan,
      prices,
      discount_label: plan.discount_label ?? usage?.discount_label ?? null,
      has_discount: hasDiscount,
    };
  });
}

export function priceForCycle(
  plan: BillingCatalogPlan,
  cycle: BillingCycle,
): BillingPrice | undefined {
  const interval = cycle === 'yearly' ? 'year' : 'month';
  return plan.prices.find((p) => normalizeInterval(p.interval) === interval);
}

/** Checkout requires a real Stripe price id (non-empty). */
export function checkoutPriceForCycle(
  plan: BillingCatalogPlan,
  cycle: BillingCycle,
): BillingPrice | undefined {
  const price = priceForCycle(plan, cycle);
  if (!price?.stripe_price_id) return undefined;
  return price;
}

export function displayAmountForCycle(
  plan: BillingCatalogPlan,
  cycle: BillingCycle,
): number | null {
  const price = priceForCycle(plan, cycle);
  if (!price) return null;
  return coerceAmount(price.unit_amount);
}

export interface CycleDiscount {
  compareAtAmount: number;
  discountPercent: number;
}

/** Strikethrough data for the selected cycle, or null when the plan is not discounted. */
export function discountForCycle(
  plan: BillingCatalogPlan,
  cycle: BillingCycle,
): CycleDiscount | null {
  const price = priceForCycle(plan, cycle);
  if (!price) return null;
  const compareAt = coerceAmount(price.compare_at_amount);
  const percent = price.discount_percent ?? computeDiscountPercent(compareAt, price.unit_amount);
  if (compareAt == null || percent == null || percent <= 0) return null;
  return { compareAtAmount: compareAt, discountPercent: percent };
}

/** Savings from paying yearly instead of 12 monthly charges, for the cycle toggle. */
export function yearlySavingsPercent(plans: BillingCatalogPlan[]): number | null {
  const percents = plans
    .map((plan) => {
      const monthly = displayAmountForCycle(plan, 'monthly');
      const yearly = displayAmountForCycle(plan, 'yearly');
      if (!monthly || !yearly || monthly <= 0 || yearly <= 0) return null;
      const fullYear = monthly * 12;
      if (yearly >= fullYear) return null;
      return Math.round(((fullYear - yearly) / fullYear) * 100);
    })
    .filter((n): n is number => n != null && n > 0);
  if (percents.length === 0) return null;
  return Math.max(...percents);
}

export function sortPlansByPrice(plans: BillingCatalogPlan[]): BillingCatalogPlan[] {
  return [...plans].sort((a, b) => {
    const aAmounts = a.prices
      .map((p) => p.unit_amount)
      .filter((n): n is number => n != null && n > 0);
    const bAmounts = b.prices
      .map((p) => p.unit_amount)
      .filter((n): n is number => n != null && n > 0);
    const aMin = aAmounts.length ? Math.min(...aAmounts) : 0;
    const bMin = bAmounts.length ? Math.min(...bAmounts) : 0;
    return aMin - bMin;
  });
}
