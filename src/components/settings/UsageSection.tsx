import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Check, Sparkles } from 'lucide-react';
import { useUsage } from '../../context/UsageContext';
import { useAuth } from '../../context/useAuth';
import { apiClient } from '../../services/apiClient';
import type { Plan } from '../../types/usage';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { BillingCycleToggle, type BillingCycle } from './BillingCycleToggle';
import './SettingsShared.css';
import './UsageSection.css';

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatUsageValue(n: number, metricKey: string): string {
  if (metricKey === 'tokens') return formatTokenCount(n);
  return n.toLocaleString();
}

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, (used / limit) * 100);
}

function planFeatures(plan: Plan): string[] {
  const { limits } = plan;
  const unlimited = plan.tier.toLowerCase().includes('enterprise');
  return [
    unlimited
      ? 'Unlimited queries per month'
      : `${limits.monthly_query_limit.toLocaleString()} Queries per month`,
    unlimited ? 'Unlimited datasets' : `${limits.max_datasets} Datasets`,
    unlimited
      ? 'Unlimited AI tokens'
      : `${formatTokenCount(limits.monthly_llm_token_limit)} Tokens per month`,
    unlimited
      ? 'Unlimited chart renders'
      : `${limits.monthly_chart_renders_limit.toLocaleString()} Chart renders`,
    unlimited
      ? 'Unlimited workspaces'
      : `${limits.max_workspaces} Workspace${limits.max_workspaces > 1 ? 's' : ''}`,
    ...(unlimited ? ['Dedicated VPC clusters', 'Scale clusters'] : []),
  ];
}

function isProTier(plan: Plan): boolean {
  const t = plan.tier.toLowerCase();
  return t.includes('pro') || plan.name.toLowerCase().includes('pro');
}

function isEnterpriseTier(plan: Plan): boolean {
  const t = plan.tier.toLowerCase();
  return t.includes('enterprise') || plan.name.toLowerCase().includes('enterprise');
}

/** Shown when the API returns no plans or the request fails */
const DEFAULT_BILLING_PLANS: Plan[] = [
  {
    id: 'free_starter',
    name: 'Free Starter',
    tier: 'free',
    description: 'Free Developer Sandbox',
    price_monthly: 0,
    price_yearly: 0,
    limits: {
      monthly_query_limit: 100,
      monthly_llm_token_limit: 50_000,
      monthly_rows_scanned_limit: 100_000,
      monthly_chart_renders_limit: 50,
      max_datasets: 3,
      max_workspaces: 1,
      max_members_per_workspace: 1,
    },
    features: {},
    is_active: true,
  },
  {
    id: 'pro_developer',
    name: 'Pro Developer',
    tier: 'pro',
    description: 'For growing teams and production workloads',
    price_monthly: 49,
    price_yearly: 470,
    limits: {
      monthly_query_limit: 5_000,
      monthly_llm_token_limit: 500_000,
      monthly_rows_scanned_limit: 5_000_000,
      monthly_chart_renders_limit: 500,
      max_datasets: 25,
      max_workspaces: 5,
      max_members_per_workspace: 10,
    },
    features: {},
    is_active: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tier: 'enterprise',
    description: 'Dedicated clusters and compliance controls',
    price_monthly: 199,
    price_yearly: 1_910,
    limits: {
      monthly_query_limit: 999_999,
      monthly_llm_token_limit: 10_000_000,
      monthly_rows_scanned_limit: 999_999_999,
      monthly_chart_renders_limit: 999_999,
      max_datasets: 999,
      max_workspaces: 999,
      max_members_per_workspace: 999,
    },
    features: {},
    is_active: true,
  },
];

function resolveDisplayPlans(apiPlans: Plan[]): Plan[] {
  const active = apiPlans
    .filter((p) => p.is_active)
    .sort((a, b) => a.price_monthly - b.price_monthly);
  return active.length > 0 ? active : DEFAULT_BILLING_PLANS;
}

function isCurrentPlan(tierPlan: Plan, currentPlanId: string, currentTier?: string): boolean {
  if (tierPlan.id === currentPlanId) return true;
  if (!currentTier) return false;
  return tierPlan.tier.toLowerCase() === currentTier.toLowerCase();
}

export function UsageSection() {
  const { user } = useAuth();
  const { currentUsage, remaining, isLoading, error } = useUsage();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_BILLING_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const fetchPlans = useCallback(async () => {
    if (!user) {
      setPlans(DEFAULT_BILLING_PLANS);
      setPlansLoading(false);
      return;
    }
    try {
      setPlansLoading(true);
      const token = await user.getIdToken();
      const [available, currentPlanRes] = await Promise.all([
        apiClient.getAvailablePlans(),
        apiClient.getCurrentPlan(token),
      ]);
      setPlans(resolveDisplayPlans(available.plans));
      setBillingCycle(currentPlanRes.billing_cycle === 'yearly' ? 'yearly' : 'monthly');
    } catch (e) {
      console.error('Failed to load plans:', e);
      setPlans(DEFAULT_BILLING_PLANS);
    } finally {
      setPlansLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

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

  const plan = currentUsage?.plan;
  const metrics = currentUsage?.metrics;
  const currentPlanId = plan?.id ?? '';

  const usageMetrics = [
    {
      key: 'queries',
      label: 'Query quota',
      caption: `${remaining?.queries_limit.toLocaleString() ?? 0} Queries per month`,
      used: remaining?.queries_used ?? metrics?.queries_used ?? 0,
      limit: remaining?.queries_limit ?? metrics?.queries_limit ?? 0,
    },
    {
      key: 'datasets',
      label: 'Table pools',
      caption: `${metrics?.datasets_limit ?? 0} Datasets`,
      used: metrics?.datasets_used ?? 0,
      limit: metrics?.datasets_limit ?? 0,
    },
    {
      key: 'tokens',
      label: 'Inference',
      caption: `${formatTokenCount(metrics?.llm_tokens_limit ?? 0)} Tokens per month`,
      used: metrics?.llm_tokens_used ?? 0,
      limit: metrics?.llm_tokens_limit ?? 0,
    },
    {
      key: 'charts',
      label: 'Graphics',
      caption: `${metrics?.chart_renders_limit ?? 0} Chart renders`,
      used: metrics?.chart_renders_used ?? 0,
      limit: metrics?.chart_renders_limit ?? 0,
    },
    {
      key: 'workspaces',
      label: 'Hierarchy',
      caption: `${plan?.limits.max_workspaces ?? 1} Workspace${(plan?.limits.max_workspaces ?? 1) > 1 ? 's' : ''}`,
      used: 1,
      limit: plan?.limits.max_workspaces ?? 1,
    },
  ];

  const getPlanPrice = (p: Plan) => (billingCycle === 'monthly' ? p.price_monthly : p.price_yearly);

  return (
    <div className="settings-page-section billing-page">
      <SettingsSectionHeader
        breadcrumbLabel="BILLING & PLANS"
        title="Billing & Plans Settings"
        description="Manage subscription and files. Keep values synchronous for corporate compliance audits."
        icon={<CreditCard size={20} strokeWidth={1.75} />}
      />

      {plan && (
        <section className="billing-current-plan settings-card">
          <div className="billing-current-plan__top">
            <div className="billing-current-plan__badges">
              <span className="billing-badge billing-badge--current">
                Current plan: {plan.name}
              </span>
              <span className="billing-badge billing-badge--id">ID: {plan.id}</span>
            </div>
            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
          </div>
          <h2 className="billing-current-plan__name">{plan.description || plan.name}</h2>
          <p className="billing-current-plan__desc">
            Ideal for individual developers exploring schema catalogs and AI-assisted analytics in a
            secure sandbox environment.
          </p>
        </section>
      )}

      <section className="billing-section">
        <h3 className="billing-section__title">
          <Check size={16} strokeWidth={2.5} aria-hidden />
          Plan includes &amp; usage tracker
        </h3>
        <div className="billing-usage-grid">
          {usageMetrics.map(({ key, label, caption, used, limit }) => (
            <div key={key} className="billing-usage-card settings-card">
              <p className="billing-usage-card__label">{label}</p>
              <p className="billing-usage-card__caption">{caption}</p>
              <div className="billing-usage-card__bar">
                <div
                  className="billing-usage-card__fill"
                  style={{ width: `${pct(used, limit)}%` }}
                />
              </div>
              <p className="billing-usage-card__used">
                Used: {formatUsageValue(used, key)} / Limit: {formatUsageValue(limit, key)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="billing-section">
        <h3 className="billing-section__title">
          <Sparkles size={16} strokeWidth={2} aria-hidden />
          Available upgrade plans &amp; limits
        </h3>

        {plansLoading ? (
          <div className="billing-plans-loading settings-card">
            <div className="billing-spinner" />
            <p>Loading plans…</p>
          </div>
        ) : (
          <div className="billing-plans-grid">
            {plans.map((tierPlan) => {
              const isCurrent = isCurrentPlan(tierPlan, currentPlanId, plan?.tier);
              const recommended = isProTier(tierPlan);
              const enterprise = isEnterpriseTier(tierPlan);
              const price = getPlanPrice(tierPlan);

              return (
                <article
                  key={tierPlan.id}
                  className={`billing-tier-card settings-card ${recommended ? 'billing-tier-card--recommended' : ''} ${isCurrent ? 'billing-tier-card--current' : ''}`}
                >
                  {recommended && <span className="billing-tier-card__ribbon">Recommended</span>}
                  <header className="billing-tier-card__header">
                    <h4 className="billing-tier-card__name">{tierPlan.name}</h4>
                    {recommended && <p className="billing-tier-card__promo">Save 20% on Annual</p>}
                    {enterprise && (
                      <p className="billing-tier-card__promo billing-tier-card__promo--link">
                        Scale clusters
                      </p>
                    )}
                  </header>
                  <div className="billing-tier-card__price">
                    <span className="billing-tier-card__amount">${price}</span>
                    <span className="billing-tier-card__period">
                      / {billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <ul className="billing-tier-card__features">
                    {planFeatures(tierPlan).map((feat) => (
                      <li key={feat}>
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="billing-tier-card__check"
                          aria-hidden
                        />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <footer className="billing-tier-card__footer">
                    {isCurrent ? (
                      <button
                        type="button"
                        className="billing-tier-card__btn billing-tier-card__btn--active"
                        disabled
                      >
                        Currently active plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="billing-tier-card__btn billing-tier-card__btn--soon"
                        disabled
                      >
                        Coming soon
                      </button>
                    )}
                  </footer>
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
            <h3>Secure Stripe gateway enabled</h3>
            <p>
              Payments and subscription changes are processed through the Stripe billing portal.
              Invoices, tax IDs, and payment methods are managed there.
            </p>
          </div>
        </div>
        <button type="button" className="billing-stripe-portal-btn" disabled>
          Coming soon
        </button>
      </section>
    </div>
  );
}
