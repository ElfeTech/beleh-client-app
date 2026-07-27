import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useUsage } from '../../context/UsageContext';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import { QuotaUsageGrid } from '../usage/QuotaUsageGrid';
import type { BillingCatalogPlan, BillingPrice, BillingSubscription } from '../../types/billing';
import { ApiRequestError, formatBillingErrorToast } from '../../utils/apiErrorMessage';
import {
  checkoutPriceForCycle,
  discountForCycle,
  displayAmountForCycle,
  enrichCatalogPlans,
  priceForCycle,
  sortPlansByPrice,
  yearlySavingsPercent,
} from '../../lib/billingCatalog';
import { planFeatureList } from '../../lib/planFeatures';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { BillingCycleToggle, type BillingCycle } from './BillingCycleToggle';
import './SettingsShared.css';
import './UsageSection.css';

function formatMoney(unitAmount: number, currency: string): string {
  const amount = unitAmount / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${(unitAmount / 100).toFixed(unitAmount % 100 === 0 ? 0 : 2)}`;
  }
}

function isProTier(plan: BillingCatalogPlan): boolean {
  const t = plan.tier.toLowerCase();
  return t.includes('pro') || plan.name.toLowerCase().includes('pro');
}

function isEnterpriseTier(plan: BillingCatalogPlan): boolean {
  const t = plan.tier.toLowerCase();
  return t.includes('enterprise') || plan.name.toLowerCase().includes('enterprise');
}

function isFreeTier(plan: BillingCatalogPlan): boolean {
  const t = plan.tier.toLowerCase();
  if (t.includes('free')) return true;
  const hasPaidAmount = plan.prices.some((p) => (p.unit_amount ?? 0) > 0);
  const hasCheckout = plan.prices.some((p) => Boolean(p.stripe_price_id));
  return !hasPaidAmount && !hasCheckout;
}

function isCurrentCatalogPlan(
  plan: BillingCatalogPlan,
  subscription: BillingSubscription | null,
  usagePlanId?: string,
  usageTier?: string,
): boolean {
  const currentId = subscription?.plan?.plan_id ?? usagePlanId ?? '';
  const currentTier = subscription?.plan?.tier ?? usageTier;
  if (currentId && plan.plan_id === currentId) return true;
  if (!currentTier) return false;
  return plan.tier.toLowerCase() === currentTier.toLowerCase();
}

function formatPeriodDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function billingErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    return formatBillingErrorToast(err.code, err.detail || fallback);
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function checkoutUrls() {
  const origin = window.location.origin;
  return {
    success_url: `${origin}/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings/billing?checkout=canceled`,
  };
}

export function UsageSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUsage, isLoading, error, refreshUsageAfterAction } = useUsage();

  const [catalogPlans, setCatalogPlans] = useState<BillingCatalogPlan[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(() => new Set());
  const plansSectionRef = useRef<HTMLElement | null>(null);
  const queryToastHandled = useRef(false);

  const fetchBilling = useCallback(async () => {
    if (!user) {
      setCatalogPlans([]);
      setSubscription(null);
      setPlansLoading(false);
      return;
    }
    try {
      setPlansLoading(true);
      const token = await user.getIdToken();
      const [catalog, sub, usagePlansRes] = await Promise.all([
        apiClient.getBillingCatalog(token),
        apiClient.getBillingSubscription(token).catch(() => null),
        apiClient.getAvailablePlans().catch(() => ({ plans: [] })),
      ]);
      const plans = sortPlansByPrice(
        enrichCatalogPlans(catalog.plans ?? [], usagePlansRes.plans ?? []),
      );
      setCatalogPlans(plans);
      setSubscription(sub);

      const hasYearly = plans.some((p) => p.prices.some((pr) => pr.interval === 'year'));
      const hasMonthly = plans.some((p) => p.prices.some((pr) => pr.interval === 'month'));
      if (sub?.stripe_price_id) {
        const matched = plans
          .flatMap((p) => p.prices)
          .find((pr) => pr.stripe_price_id === sub.stripe_price_id);
        if (matched?.interval === 'year') setBillingCycle('yearly');
        else if (matched?.interval === 'month') setBillingCycle('monthly');
      } else if (!hasMonthly && hasYearly) {
        setBillingCycle('yearly');
      }
    } catch (e) {
      console.error('Failed to load billing catalog:', e);
      toast.error(billingErrorMessage(e, 'Failed to load billing plans'));
      setCatalogPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchBilling();
  }, [fetchBilling]);

  useEffect(() => {
    if (queryToastHandled.current) return;
    const checkout = searchParams.get('checkout');
    const upgraded = searchParams.get('upgraded');
    const upgrade = searchParams.get('upgrade');

    if (checkout === 'canceled') {
      queryToastHandled.current = true;
      toast.message('Checkout canceled. No changes were made.');
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    } else if (upgraded === '1') {
      queryToastHandled.current = true;
      toast.success('Subscription updated.');
      void refreshUsageAfterAction();
      void fetchBilling();
      const next = new URLSearchParams(searchParams);
      next.delete('upgraded');
      setSearchParams(next, { replace: true });
    } else if (upgrade === '1' && plansSectionRef.current) {
      queryToastHandled.current = true;
      plansSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const next = new URLSearchParams(searchParams);
      next.delete('upgrade');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshUsageAfterAction, fetchBilling]);

  const openPortal = useCallback(async () => {
    if (!user || portalLoading) return;
    try {
      setPortalLoading(true);
      const token = await user.getIdToken();
      const { portal_url } = await apiClient.createBillingPortalSession(token, {
        return_url: `${window.location.origin}/settings/billing`,
      });
      window.location.assign(portal_url);
    } catch (e) {
      toast.error(billingErrorMessage(e, 'Could not open the billing portal'));
      setPortalLoading(false);
    }
  }, [user, portalLoading]);

  const startCheckout = useCallback(
    async (price: BillingPrice) => {
      if (!user || checkoutPriceId || !price.stripe_price_id) return;
      try {
        setCheckoutPriceId(price.stripe_price_id);
        const token = await user.getIdToken();
        const urls = checkoutUrls();
        const { checkout_url } = await apiClient.createCheckoutSession(token, {
          stripe_price_id: price.stripe_price_id,
          ...urls,
        });
        window.location.assign(checkout_url);
      } catch (e) {
        toast.error(billingErrorMessage(e, 'Could not start checkout'));
        setCheckoutPriceId(null);
      }
    },
    [user, checkoutPriceId],
  );

  const togglePlanFeatures = useCallback((planId: string) => {
    setExpandedPlans((current) => {
      const next = new Set(current);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  }, []);

  if (isLoading && !currentUsage) {
    return (
      <div className="settings-page-section billing-page">
        <div className="billing-loading settings-card">
          <div className="billing-spinner" />
          <p>Loading billing data…</p>
        </div>
      </div>
    );
  }

  if (error && !currentUsage) {
    return (
      <div className="settings-page-section billing-page">
        <div className="billing-error settings-card">
          <h3>Failed to load billing</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const usagePlan = currentUsage?.plan;
  const planName = subscription?.plan?.name ?? usagePlan?.name ?? 'Free';
  const planDescription = usagePlan?.description ?? subscription?.plan?.name ?? planName;
  const periodEnd = formatPeriodDate(
    subscription?.billing_cycle_end ?? currentUsage?.billing_cycle_end,
  );
  const status = subscription?.status ?? null;
  const isPastDue = status === 'past_due' || status === 'unpaid';
  const cancelAtPeriodEnd = Boolean(subscription?.cancel_at_period_end);
  const hasStripeSub = Boolean(subscription?.stripe_subscription_id);
  const showCycleToggle = catalogPlans.some(
    (p) =>
      p.prices.some((pr) => pr.interval === 'month') &&
      p.prices.some((pr) => pr.interval === 'year'),
  );
  const annualSavings = yearlySavingsPercent(catalogPlans);

  return (
    <div className="settings-page-section billing-page">
      <SettingsSectionHeader
        breadcrumbLabel="BILLING & PLANS"
        title="Billing & Plans Settings"
        description="Manage your subscription, usage quotas, and payment method."
        icon={<CreditCard size={20} strokeWidth={1.75} />}
      />

      {isPastDue && (
        <section className="billing-alert billing-alert--past-due settings-card" role="alert">
          <div>
            <h3>Payment past due</h3>
            <p>Update your payment method to keep your {planName} plan and avoid interruption.</p>
          </div>
          <button
            type="button"
            className="billing-stripe-portal-btn"
            disabled={portalLoading}
            onClick={() => void openPortal()}
          >
            {portalLoading ? 'Opening…' : 'Update payment method'}
          </button>
        </section>
      )}

      <section className="billing-current-plan settings-card">
        <div className="billing-current-plan__top">
          <div className="billing-current-plan__badges">
            <span className="billing-badge billing-badge--current">Current plan: {planName}</span>
            {status && (
              <span
                className={`billing-badge billing-badge--status billing-badge--status-${status}`}
              >
                {status.replaceAll('_', ' ')}
              </span>
            )}
            {cancelAtPeriodEnd && (
              <span className="billing-badge billing-badge--cancel">Cancels at period end</span>
            )}
          </div>
          {showCycleToggle && (
            <BillingCycleToggle
              value={billingCycle}
              onChange={setBillingCycle}
              yearlySavingsPercent={annualSavings}
            />
          )}
        </div>
        <h2 className="billing-current-plan__name">{planDescription}</h2>
        <p className="billing-current-plan__desc">
          {periodEnd
            ? cancelAtPeriodEnd
              ? `Access continues until ${periodEnd}.`
              : `Current billing period ends ${periodEnd}.`
            : 'Usage resets each billing cycle.'}
        </p>
        {hasStripeSub && (
          <div className="billing-current-plan__actions">
            <button
              type="button"
              className="billing-manage-btn"
              disabled={portalLoading}
              onClick={() => void openPortal()}
            >
              {portalLoading ? 'Opening…' : 'Manage billing'}
            </button>
          </div>
        )}
      </section>

      <section className="billing-section">
        <h3 className="billing-section__title">
          <Check size={16} strokeWidth={2.5} aria-hidden />
          Plan includes &amp; usage tracker
        </h3>

        <QuotaUsageGrid />
      </section>

      <section className="billing-section" ref={plansSectionRef} id="billing-plans">
        <h3 className="billing-section__title">
          <Sparkles size={16} strokeWidth={2} aria-hidden />
          Available upgrade plans &amp; limits
        </h3>

        {plansLoading ? (
          <div className="billing-plans-loading settings-card">
            <div className="billing-spinner" />
            <p>Loading plans…</p>
          </div>
        ) : catalogPlans.length === 0 ? (
          <div className="billing-error settings-card">
            <h3>Plans unavailable</h3>
            <p>We could not load pricing right now. Please try again later.</p>
            <button
              type="button"
              className="billing-manage-btn"
              onClick={() => void fetchBilling()}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="billing-plans-grid">
            {catalogPlans.map((tierPlan) => {
              const isCurrent = isCurrentCatalogPlan(
                tierPlan,
                subscription,
                usagePlan?.id,
                usagePlan?.tier,
              );
              const recommended = isProTier(tierPlan);
              const enterprise = isEnterpriseTier(tierPlan);
              const free = isFreeTier(tierPlan);
              const price = priceForCycle(tierPlan, billingCycle);
              const checkoutPrice = checkoutPriceForCycle(tierPlan, billingCycle);
              const displayAmount = displayAmountForCycle(tierPlan, billingCycle);
              const discount = discountForCycle(tierPlan, billingCycle);
              const currency = price?.currency || 'usd';
              const busy = checkoutPriceId === checkoutPrice?.stripe_price_id;
              const allFeatures = planFeatureList(tierPlan);
              const featuresExpanded = expandedPlans.has(tierPlan.plan_id);
              const visibleFeatures = featuresExpanded ? allFeatures : allFeatures.slice(0, 8);

              let cta: ReactNode;
              if (isCurrent) {
                cta = (
                  <button
                    type="button"
                    className="billing-tier-card__btn billing-tier-card__btn--active"
                    disabled
                  >
                    Currently active plan
                  </button>
                );
              } else if (checkoutPrice) {
                cta = (
                  <button
                    type="button"
                    className="billing-tier-card__btn billing-tier-card__btn--upgrade"
                    disabled={Boolean(checkoutPriceId)}
                    onClick={() => void startCheckout(checkoutPrice)}
                  >
                    {busy ? 'Redirecting…' : `Upgrade to ${tierPlan.name}`}
                  </button>
                );
              } else if (enterprise && (free || displayAmount == null)) {
                cta = (
                  <button
                    type="button"
                    className="billing-tier-card__btn billing-tier-card__btn--outline"
                    onClick={() => navigate('/settings/help')}
                  >
                    Contact sales
                  </button>
                );
              } else if (free || (displayAmount != null && displayAmount === 0 && !checkoutPrice)) {
                cta = (
                  <button
                    type="button"
                    className="billing-tier-card__btn billing-tier-card__btn--active"
                    disabled
                  >
                    Free
                  </button>
                );
              } else {
                cta = (
                  <button
                    type="button"
                    className="billing-tier-card__btn billing-tier-card__btn--soon"
                    disabled
                  >
                    Checkout unavailable
                  </button>
                );
              }

              return (
                <article
                  key={tierPlan.plan_id}
                  className={`billing-tier-card settings-card ${recommended ? 'billing-tier-card--recommended' : ''} ${isCurrent ? 'billing-tier-card--current' : ''}`}
                >
                  {recommended && <span className="billing-tier-card__ribbon">Recommended</span>}
                  <header className="billing-tier-card__header">
                    <h4 className="billing-tier-card__name">{tierPlan.name}</h4>
                    {discount && tierPlan.discount_label && (
                      <p className="billing-tier-card__promo billing-tier-card__promo--deal">
                        {tierPlan.discount_label}
                      </p>
                    )}
                    {!discount && recommended && price?.interval === 'year' && (
                      <p className="billing-tier-card__promo">Billed annually</p>
                    )}
                  </header>
                  <div className="billing-tier-card__price">
                    {displayAmount != null ? (
                      <>
                        <span className="billing-tier-card__amount">
                          {formatMoney(displayAmount, currency)}
                        </span>
                        {(displayAmount > 0 || !free) && (
                          <span className="billing-tier-card__period">
                            / {billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        )}
                        {discount && (
                          <span className="billing-tier-card__discount">
                            <s
                              className="billing-tier-card__compare"
                              aria-label={`Regular price ${formatMoney(discount.compareAtAmount, currency)}`}
                            >
                              {formatMoney(discount.compareAtAmount, currency)}
                            </s>
                            <span className="billing-tier-card__save-badge">
                              Save {discount.discountPercent}%
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="billing-tier-card__amount">
                        {enterprise ? 'Custom' : free ? '$0' : '—'}
                      </span>
                    )}
                  </div>
                  <ul className="billing-tier-card__features">
                    {visibleFeatures.map((feature) => (
                      <li key={feature.key}>
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="billing-tier-card__check"
                          aria-hidden
                        />
                        {feature.label}
                      </li>
                    ))}
                  </ul>
                  {allFeatures.length > 8 && (
                    <button
                      type="button"
                      className="billing-tier-card__more"
                      aria-expanded={featuresExpanded}
                      onClick={() => togglePlanFeatures(tierPlan.plan_id)}
                    >
                      {featuresExpanded
                        ? 'Show fewer features'
                        : `Show all ${allFeatures.length} features`}
                    </button>
                  )}
                  <footer className="billing-tier-card__footer">{cta}</footer>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="billing-stripe-banner settings-card">
        <div className="billing-stripe-banner__text">
          <span className="billing-stripe-dot" aria-hidden />
          <div>
            <h3>Secure Stripe billing</h3>
            <p>
              Payments, invoices, tax IDs, and payment methods are managed in the Stripe customer
              portal. Cancel or change plans there anytime.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="billing-stripe-portal-btn"
          disabled={portalLoading || !hasStripeSub}
          title={!hasStripeSub ? 'Available after you subscribe' : undefined}
          onClick={() => void openPortal()}
        >
          {portalLoading
            ? 'Opening…'
            : hasStripeSub
              ? 'Open billing portal'
              : 'Subscribe to manage'}
        </button>
      </section>
    </div>
  );
}
