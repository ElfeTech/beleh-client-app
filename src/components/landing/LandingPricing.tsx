import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import type { BillingCatalogPlan } from '../../types/billing';
import {
  catalogPlansFromUsagePlans,
  discountForCycle,
  displayAmountForCycle,
  type BillingCycle,
  yearlySavingsPercent,
} from '../../lib/billingCatalog';
import { planFeatureList } from '../../lib/planFeatures';

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
): string {
  if (free) return 'Start 7-day free trial';
  if (enterprise && (amount == null || amount === 0)) return 'Talk to us';
  return `Get ${plan.name}`;
}

function PricingCard({
  plan,
  billingCycle,
  onGetStarted,
}: Readonly<{
  plan: BillingCatalogPlan;
  billingCycle: BillingCycle;
  onGetStarted: () => void;
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
  const ctaLabel = planCtaLabel(plan, free, enterprise, amount);

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
        onClick={onGetStarted}
      >
        {ctaLabel}
      </button>
    </article>
  );
}

function PricingBody({
  loading,
  error,
  plans,
  billingCycle,
  onGetStarted,
}: Readonly<{
  loading: boolean;
  error: string | null;
  plans: BillingCatalogPlan[];
  billingCycle: BillingCycle;
  onGetStarted: () => void;
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
      {plans.map((plan) => (
        <PricingCard
          key={plan.plan_id}
          plan={plan}
          billingCycle={billingCycle}
          onGetStarted={onGetStarted}
        />
      ))}
    </div>
  );
}

export function LandingPricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<BillingCatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.getAvailablePlans();
        if (cancelled) return;
        const next = catalogPlansFromUsagePlans(res.plans ?? []);
        setPlans(next);
        if (planHasInterval(next, 'year') && !planHasInterval(next, 'month')) {
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
  }, []);

  const showCycleToggle = plans.some(planSupportsBothCycles);
  const annualSavings = yearlySavingsPercent(plans);

  return (
    <section className="landing-section landing-pricing" id="pricing">
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
          onGetStarted={() => navigate('/signup')}
        />
      </div>
    </section>
  );
}
