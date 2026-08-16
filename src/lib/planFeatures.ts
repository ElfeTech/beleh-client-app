import type { BillingCatalogPlan } from '../types/billing';
import { formatCreditCostUsd, formatCreditCount } from '../utils/formatters';

export interface PlanFeatureLine {
  key: string;
  label: string;
  source: 'limit' | 'feature';
}

const FEATURE_LABELS: Record<string, string> = {
  ai_insights: 'AI insights',
  api_access: 'API access',
  sso: 'SSO',
  sla: 'SLA',
  audit_logs: 'Audit logs',
  priority_support: 'Priority support',
  team_collaboration: 'Team collaboration',
  custom_dashboards: 'Custom dashboards',
  custom_integrations: 'Custom integrations',
  dedicated_support: 'Dedicated support',
  advanced_charts: 'Advanced charts',
  basic_charts: 'Charts',
  export_csv: 'CSV export',
};

const FEATURE_ORDER = [
  'basic_charts',
  'advanced_charts',
  'ai_insights',
  'custom_dashboards',
  'export_csv',
  'api_access',
  'team_collaboration',
  'audit_logs',
  'priority_support',
  'sso',
  'custom_integrations',
  'dedicated_support',
  'sla',
];

function humanizeFeatureKey(key: string): string {
  const known = FEATURE_LABELS[key];
  if (known) return known;
  const words = key.replaceAll('_', ' ').replaceAll('-', ' ').trim();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : key;
}

function countLabel(
  value: number | null | undefined,
  singular: string,
  plural = `${singular}s`,
): string {
  if (value == null || value <= 0) return `Unlimited ${plural.toLowerCase()}`;
  const noun = value === 1 ? singular : plural;
  return `${value.toLocaleString()} ${noun}`;
}

function limitLines(plan: BillingCatalogPlan): PlanFeatureLine[] {
  const limits = plan.limits ?? ({} as BillingCatalogPlan['limits']);
  const lines: PlanFeatureLine[] = [];

  // Omit query lines when unlimited / missing (-1 / <= 0 / nullish).
  const queryLimit = limits.monthly_query_limit;
  if (typeof queryLimit === 'number' && queryLimit > 0) {
    lines.push({
      key: 'limit-queries',
      label: `${queryLimit.toLocaleString()} prompts per month`,
      source: 'limit',
    });
  }

  const creditLimit = limits.monthly_credit_limit;
  const creditCostLine = formatCreditCostUsd(plan.credit_cost_usd);
  lines.push(
    {
      key: 'limit-datasets',
      label: countLabel(limits.max_datasets, 'Dataset'),
      source: 'limit',
    },
    {
      key: 'limit-credits',
      label:
        creditLimit == null || creditLimit <= 0
          ? 'Unlimited AI credits'
          : `${formatCreditCount(creditLimit)} AI credits per month`,
      source: 'limit',
    },
  );
  if (creditCostLine) {
    lines.push({
      key: 'limit-credit-cost',
      label: creditCostLine,
      source: 'limit',
    });
  }
  lines.push(
    {
      key: 'limit-charts',
      label: countLabel(limits.monthly_chart_renders_limit, 'Chart render'),
      source: 'limit',
    },
    {
      key: 'limit-workspaces',
      label: countLabel(limits.max_workspaces, 'Workspace'),
      source: 'limit',
    },
    {
      key: 'limit-members',
      label: countLabel(
        limits.max_members_per_workspace,
        'Member per workspace',
        'Members per workspace',
      ),
      source: 'limit',
    },
  );

  return lines;
}

function featureValueLabel(key: string, value: boolean | string | number): string | null {
  if (value === false) return null;
  const label = humanizeFeatureKey(key);
  if (value === true) return label;
  if (typeof value === 'number') return `${label}: ${value.toLocaleString()}`;
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}` : label;
}

function featureLines(plan: BillingCatalogPlan): PlanFeatureLine[] {
  const entries = Object.entries(plan.features ?? {});
  const order = new Map(FEATURE_ORDER.map((key, index) => [key, index]));

  entries.sort(([a], [b]) => {
    const aOrder = order.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = order.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aOrder === bOrder ? a.localeCompare(b) : aOrder - bOrder;
  });

  return entries.reduce<PlanFeatureLine[]>((lines, [key, value]) => {
    const label = featureValueLabel(key, value);
    if (label) lines.push({ key: `feature-${key}`, label, source: 'feature' });
    return lines;
  }, []);
}

/** Capacity limits plus truthy API feature entries in deterministic order. */
export function planFeatureList(plan: BillingCatalogPlan): PlanFeatureLine[] {
  return [...limitLines(plan), ...featureLines(plan)];
}
