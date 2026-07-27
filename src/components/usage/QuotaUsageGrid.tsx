import { useUsage } from '../../context/UsageContext';
import { formatTokenCount, formatUsageValue, usagePercentage } from '../../utils/formatters';
import '../settings/SettingsShared.css';
import './usageCards.css';

interface UsageMetricCard {
  key: string;
  label: string;
  caption: string;
  used: number;
  limit: number;
}

export function QuotaUsageGrid() {
  const { currentUsage, remaining } = useUsage();
  const metrics = currentUsage?.metrics;
  const plan = currentUsage?.plan;

  if (!metrics || !plan) return null;

  const usageMetrics: UsageMetricCard[] = [
    {
      key: 'queries',
      label: 'Query quota',
      caption: `${remaining?.queries_limit.toLocaleString() ?? metrics.queries_limit.toLocaleString()} Queries per month`,
      used: remaining?.queries_used ?? metrics.queries_used,
      limit: remaining?.queries_limit ?? metrics.queries_limit,
    },
    {
      key: 'datasets',
      label: 'Table pools',
      caption: `${metrics.datasets_limit} Datasets`,
      used: metrics.datasets_used,
      limit: metrics.datasets_limit,
    },
    {
      key: 'tokens',
      label: 'Inference',
      caption: `${formatTokenCount(metrics.llm_tokens_limit)} Tokens per month`,
      used: metrics.llm_tokens_used,
      limit: metrics.llm_tokens_limit,
    },
    {
      key: 'charts',
      label: 'Graphics',
      caption: `${metrics.chart_renders_limit} Chart renders`,
      used: metrics.chart_renders_used,
      limit: metrics.chart_renders_limit,
    },
    {
      key: 'workspaces',
      label: 'Hierarchy',
      caption: `${plan.limits.max_workspaces} Workspace${plan.limits.max_workspaces === 1 ? '' : 's'}`,
      used: 1,
      limit: plan.limits.max_workspaces,
    },
  ];

  return (
    <div className="billing-usage-grid">
      {usageMetrics.map(({ key, label, caption, used, limit }) => (
        <div key={key} className="billing-usage-card settings-card">
          <p className="billing-usage-card__label">{label}</p>
          <p className="billing-usage-card__caption">{caption}</p>
          <div className="billing-usage-card__bar">
            <div
              className="billing-usage-card__fill"
              style={{ width: `${usagePercentage(used, limit)}%` }}
            />
          </div>
          <p className="billing-usage-card__used">
            Used: {formatUsageValue(used, key)} / Limit: {formatUsageValue(limit, key)}
          </p>
        </div>
      ))}
    </div>
  );
}
