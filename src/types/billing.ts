// Billing API types — matches /api/billing/* Stripe subscription contract

import type { PlanFeatures, PlanLimits } from './usage';

export type BillingPriceInterval = 'month' | 'year' | 'week' | 'day';

export interface BillingPrice {
  stripe_price_id: string;
  interval: BillingPriceInterval;
  /** Stripe minor units (cents). May be null from API before sync. */
  unit_amount: number | null;
  /** Strikethrough "was" price in cents. Display only; never charged. */
  compare_at_amount?: number | null;
  /** Server-computed savings when compare_at_amount exceeds unit_amount. */
  discount_percent?: number | null;
  currency: string;
}

export interface BillingCatalogPlan {
  plan_id: string;
  name: string;
  tier: string;
  description: string;
  features: PlanFeatures;
  limits: PlanLimits;
  prices: BillingPrice[];
  stripe_product_id: string | null;
  /** Marketing badge text, e.g. "Launch special". */
  discount_label?: string | null;
  has_discount?: boolean;
}

export interface BillingCatalogResponse {
  plans: BillingCatalogPlan[];
}

export interface CheckoutRequest {
  stripe_price_id: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export interface PortalRequest {
  return_url?: string;
}

export interface PortalResponse {
  portal_url: string;
}

export type BillingSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export interface BillingSubscriptionPlan {
  plan_id: string;
  name: string;
  tier: string;
}

export interface BillingSubscription {
  status: BillingSubscriptionStatus;
  plan: BillingSubscriptionPlan | null;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  features: PlanFeatures;
}
