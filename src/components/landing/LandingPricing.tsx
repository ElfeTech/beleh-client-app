import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import type { BillingCatalogPlan } from '../../types/billing';
import {
  catalogPlansFromUsagePlans,
  checkoutPriceForCycle,
  discountForCycle,
  displayAmountForCycle,
  enrichCatalogPlans,
  sortPlansByPrice,
  type BillingCycle,
  yearlySavingsPercent,
} from '../../lib/billingCatalog';
import { planFeatureList } from '../../lib/planFeatures';
import {
  parsePricingIntent,
  signUpPathWithPricingIntent,
} from '../../lib/pricingIntent';
import { SUPPORT_EMAIL } from '../../constants/site';
import { ApiRequestError, formatBillingErrorToast } from '../../utils/apiErrorMessage';

function billingErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) {
    return formatBillingErrorToast(err.code, err.detail || fallback);
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function pricingCheckoutUrls() {
  const origin = window.location.origin;
  return {
    success_url: `${origin}/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=canceled`,
  };
}

function formatMoney(unitAmount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
    }).format(unitAmount / 100);
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
  return !plan.prices.some((p) => (p.unit_amount ?? 0) > 0);
}

function planHasInterval(plans: BillingCatalogPlan[], interval: 'month' | 'year'): boolean {
  return plans.some((plan) => plan.prices.some((price) => price.interval === interval));
}

function planSupportsBothCycles(plan: BillingCatalogPlan): boolean {
  const hasMonth = plan.prices.some((price) => price.interval === 'month');
  const hasYear = plan.prices.some((price) => price.interval === 'year');
  return hasMonth && hasYear;
}

function fallbackPriceLabel(enterprise: boolean, free: boolean): string {
  if (enterprise) return 'Custom';
  if (free) return '$0';
  return '—';
}

function planCtaLabel(
  plan: BillingCatalogPlan,
  free: boolean,
  enterprise: boolean,
  amount: number | null,
  unavailable: boolean,
): string {
  if (unavailable) return 'Unavailable';
  if (free) return 'Start 7-day free trial';
  if (enterprise && (amount == null || amount === 0)) return 'Talk to us';
  return `Get ${plan.name}`;
}

function PricingCard({
  plan,
  billingCycle,
  onSelectPlan,
  checkingOut,
  unavailable,
}: Readonly<{
  plan: BillingCatalogPlan;
  billingCycle: BillingCycle;
  onSelectPlan: () => void;
  checkingOut: boolean;
  unavailable: boolean;
}>) {
  const recommended = isProTier(plan);
  const enterprise = isEnterpriseTier(plan);
  const free = isFreeTier(plan);
  const amount = displayAmountForCycle(plan, billingCycle);
  const discount = discountForCycle(plan, billingCycle);
  const currency =
    plan.prices.find((p) => p.interval === (billingCycle === 'yearly' ? 'year' : 'month'))
      ?.currency || 'usd';
  const features = planFeatureList(plan).slice(0, 8);
  const periodLabel = billingCycle === 'monthly' ? 'month' : 'year';
  const ctaLabel = planCtaLabel(plan, free, enterprise, amount, unavailable);

  return (
    <article
      className={`landing-pricing-card ${recommended ? 'landing-pricing-card--featured' : ''}`}
    >
      {recommended ? <span className="landing-pricing-card__badge">Most popular</span> : null}
      <header className="landing-pricing-card__header">
        <h3>{plan.name}</h3>
        {plan.description ? <p>{plan.description}</p> : null}
        {discount && plan.discount_label ? (
          <span className="landing-pricing-card__deal">{plan.discount_label}</span>
        ) : null}
      </header>

      <div className="landing-pricing-card__price">
        {amount != null ? (
          <>
            <span className="landing-pricing-card__amount">{formatMoney(amount, currency)}</span>
            {(amount > 0 || !free) && (
              <span className="landing-pricing-card__period">/ {periodLabel}</span>
            )}
            {discount ? (
              <span className="landing-pricing-card__discount">
                <s>{formatMoney(discount.compareAtAmount, currency)}</s>
                <em>Save {discount.discountPercent}%</em>
              </span>
            ) : null}
          </>
        ) : (
          <span className="landing-pricing-card__amount">
            {fallbackPriceLabel(enterprise, free)}
          </span>
        )}
      </div>

      <ul className="landing-pricing-card__features">
        {features.map((feature) => (
          <li key={feature.key}>
            <Check size={14} strokeWidth={2.5} aria-hidden />
            {feature.label}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`landing-btn ${
          recommended ? 'landing-btn-primary' : 'landing-btn-ghost-dark'
        } landing-pricing-card__cta`}
        onClick={onSelectPlan}
        disabled={checkingOut || unavailable}
        aria-busy={checkingOut || undefined}
      >
        {checkingOut ? 'Redirecting…' : ctaLabel}
      </button>
    </article>
  );
}

function PricingBody({
  loading,
  error,
  plans,
  billingCycle,
  checkoutPlanId,
  isAuthenticated,
  onSelectPlan,
}: Readonly<{
  loading: boolean;
  error: string | null;
  plans: BillingCatalogPlan[];
  billingCycle: BillingCycle;
  checkoutPlanId: string | null;
  isAuthenticated: boolean;
  onSelectPlan: (plan: BillingCatalogPlan) => void;
}>) {
  if (loading) {
    return (
      <div className="landing-pricing__state" aria-busy="true">
        <div className="landing-pricing__spinner" />
        <p>Loading plans…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-pricing__state">
        <p>{error}</p>
        <button
          type="button"
          className="landing-btn landing-btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="landing-pricing__state">
        <p>No plans are available right now. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="landing-pricing__grid">
      {plans.map((plan) => {
        const free = isFreeTier(plan);
        const enterprise = isEnterpriseTier(plan);
        const amount = displayAmountForCycle(plan, billingCycle);
        const paidWithoutCheckout =
          isAuthenticated &&
          !free &&
          !(enterprise && (amount == null || amount === 0)) &&
          !checkoutPriceForCycle(plan, billingCycle);

        return (
          <PricingCard
            key={plan.plan_id}
            plan={plan}
            billingCycle={billingCycle}
            onSelectPlan={() => onSelectPlan(plan)}
            checkingOut={checkoutPlanId === plan.plan_id}
            unavailable={paidWithoutCheckout}
          />
        );
      })}
    </div>
  );
}

export interface LandingPricingProps {
  /** When true, renders as a standalone page section (no in-page anchor id). */
  readonly standalone?: boolean;
}

export function LandingPricing({ standalone = false }: LandingPricingProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [plans, setPlans] = useState<BillingCatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const autoCheckoutStartedRef = useRef(false);

  const startCheckout = useCallback(
    async (plan: BillingCatalogPlan, cycle: BillingCycle) => {
      if (!user || checkoutPlanId) return;
      const price = checkoutPriceForCycle(plan, cycle);
      if (!price?.stripe_price_id) return;

      try {
        setCheckoutPlanId(plan.plan_id);
        const token = await user.getIdToken();
        const { checkout_url } = await apiClient.createCheckoutSession(token, {
          stripe_price_id: price.stripe_price_id,
          ...pricingCheckoutUrls(),
        });
        window.location.assign(checkout_url);
      } catch (e) {
        toast.error(billingErrorMessage(e, 'Could not start checkout'));
        setCheckoutPlanId(null);
      }
    },
    [user, checkoutPlanId],
  );

  const handlePlanSelect = useCallback(
    (plan: BillingCatalogPlan) => {
      const free = isFreeTier(plan);
      const enterprise = isEnterpriseTier(plan);
      const amount = displayAmountForCycle(plan, billingCycle);

      if (enterprise && (amount == null || amount === 0)) {
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Enterprise plan inquiry')}`;
        return;
      }

      if (free) {
        if (user) {
          navigate('/settings/billing');
        } else {
          navigate('/signup');
        }
        return;
      }

      if (!user) {
        navigate(
          signUpPathWithPricingIntent({
            planId: plan.plan_id,
            cycle: billingCycle,
            checkout: true,
          }),
        );
        return;
      }

      void startCheckout(plan, billingCycle);
    },
    [billingCycle, navigate, startCheckout, user],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoading(true);
      setError(null);
      try {
        const usageRes = await apiClient.getAvailablePlans();
        if (cancelled) return;

        const usagePlans = usageRes.plans ?? [];
        let displayPlans = catalogPlansFromUsagePlans(usagePlans);

        if (user) {
          try {
            const token = await user.getIdToken();
            const catalogRes = await apiClient.getBillingCatalog(token);
            if (cancelled) return;
            const catalogPlans = catalogRes.plans ?? [];
            if (catalogPlans.length > 0) {
              displayPlans = sortPlansByPrice(enrichCatalogPlans(catalogPlans, usagePlans));
            }
          } catch {
            // Fall back to public display list when catalog auth fails.
          }
        }

        setPlans(displayPlans);
        if (planHasInterval(displayPlans, 'year') && !planHasInterval(displayPlans, 'month')) {
          setBillingCycle('yearly');
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
          setError('We could not load pricing right now. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const intent = parsePricingIntent(searchParams.toString());
    if (intent?.cycle) {
      setBillingCycle(intent.cycle);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('checkout') !== 'canceled') return;
    toast.info('Checkout was canceled. You can try again when ready.');
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user || loading || autoCheckoutStartedRef.current) return;

    const intent = parsePricingIntent(searchParams.toString());
    if (!intent?.checkout) return;

    const plan = plans.find((p) => p.plan_id === intent.planId);
    if (!plan || isFreeTier(plan)) return;

    const price = checkoutPriceForCycle(plan, intent.cycle);
    if (!price) return;

    autoCheckoutStartedRef.current = true;
    setBillingCycle(intent.cycle);

    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });

    void startCheckout(plan, intent.cycle);
  }, [user, loading, plans, searchParams, setSearchParams, startCheckout]);

  const showCycleToggle = plans.some(planSupportsBothCycles);
  const annualSavings = yearlySavingsPercent(plans);

  return (
    <section
      className={`landing-section landing-pricing${standalone ? ' landing-pricing--standalone' : ''}`}
      id={standalone ? undefined : 'pricing'}
    >
      <div className="landing-wrap">
        <div className="landing-pricing__header landing-reveal">
          <div className="landing-eyebrow" style={{ justifyContent: 'center' }}>
            <span className="dot" />
            <span>PRICING</span>
          </div>
          <h2>Simple plans that scale with your team</h2>
          <p>
            Start with a free 7-day trial , upgrade as soon as you see the value, often in less than
            a week.
          </p>

          {showCycleToggle ? (
            <fieldset className="landing-pricing__cycle">
              <legend className="sr-only">Billing cycle</legend>
              <button
                type="button"
                className={billingCycle === 'monthly' ? 'is-active' : undefined}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={billingCycle === 'yearly' ? 'is-active' : undefined}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                {annualSavings != null ? (
                  <span className="landing-pricing__save">Save {annualSavings}%</span>
                ) : null}
              </button>
            </fieldset>
          ) : null}
        </div>

        <PricingBody
          loading={loading}
          error={error}
          plans={plans}
          billingCycle={billingCycle}
          checkoutPlanId={checkoutPlanId}
          isAuthenticated={Boolean(user)}
          onSelectPlan={handlePlanSelect}
        />
      </div>
    </section>
  );
}
