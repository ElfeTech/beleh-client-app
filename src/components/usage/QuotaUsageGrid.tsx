import { useWorkspace } from '../../context/WorkspaceContext';
import { useUsage } from '../../context/UsageContext';
import {
  formatQuotaResetAt,
  formatQuotaResetDate,
  formatTokenCount,
  formatUsageValue,
  usagePercentage,
} from '../../utils/formatters';
import {
  isUnlimitedLimit,
  trialDaysLeft,
  USAGE_HARD_LIMIT_PCT,
  USAGE_SOFT_WARN_PCT,
} from '../../utils/workspaceAccess';
import type { WorkspaceUsageResponse } from '../../types/api';
import type { PlanLimits } from '../../types/usage';
import '../settings/SettingsShared.css';
import './usageCards.css';

interface UsageMetricCard {
  key: string;
  label: string;
  caption: string;
  used: number;
  limit: number;
  /** Optional per-card reset hint (e.g. daily). */
  resetHint?: string | null;
}

export type QuotaUsageGridMode = 'workspace' | 'personal';

export interface QuotaUsageGridProps {
  /**
   * `personal` , billing page: signed-in account meters from GET /api/usage/.
   * `workspace` , in-product: GET /workspaces/{id}/usage when available.
   */
  mode?: QuotaUsageGridMode;
  /**
   * When set (e.g. matched billing catalog plan), override displayed limits so meters
   * match the subscribed plan cards even if usage payload limits are stale.
   * Usage payload still wins when present (backend source of truth).
   */
  planLimits?: PlanLimits | null;
}

function meterTone(used: number, limit: number): 'ok' | 'warn' | 'hard' {
  if (isUnlimitedLimit(limit)) return 'ok';
  const pct = usagePercentage(used, limit);
  if (pct >= USAGE_HARD_LIMIT_PCT) return 'hard';
  if (pct >= USAGE_SOFT_WARN_PCT) return 'warn';
  return 'ok';
}

/** Prefer usage (workspace/account API) over catalog plan limits. */
function resolveLimit(
  fromUsage: number | null | undefined,
  fromPlan: number | null | undefined,
): number {
  if (fromUsage != null && Number.isFinite(fromUsage)) return fromUsage;
  if (fromPlan != null && Number.isFinite(fromPlan)) return fromPlan;
  return 0;
}

function buildWorkspaceMetrics(
  usage: WorkspaceUsageResponse,
  planLimits?: PlanLimits | null,
): UsageMetricCard[] {
  const seatsLimit = resolveLimit(usage.seats_limit, planLimits?.max_members_per_workspace);
  const datasetsLimit = resolveLimit(usage.datasources_limit, planLimits?.max_datasets);
  const workspacesLimit = resolveLimit(usage.workspaces_limit, planLimits?.max_workspaces);
  const queriesLimit = resolveLimit(usage.queries_limit, planLimits?.monthly_query_limit);
  const tokensLimit = resolveLimit(usage.llm_tokens_limit, planLimits?.monthly_llm_token_limit);
  const dailyLimit = usage.daily_llm_tokens_limit;

  const cards: UsageMetricCard[] = [
    {
      key: 'seats',
      label: 'Seats',
      caption: isUnlimitedLimit(seatsLimit) ? 'Unlimited seats' : `${seatsLimit} seats`,
      used: usage.seats_used,
      limit: seatsLimit,
    },
    {
      key: 'datasets',
      label: 'Data sources',
      caption: isUnlimitedLimit(datasetsLimit)
        ? 'Unlimited files + databases'
        : `${datasetsLimit} files + databases`,
      used: usage.datasources_used,
      limit: datasetsLimit,
    },
    {
      key: 'workspaces',
      label: 'Workspaces',
      caption: isUnlimitedLimit(workspacesLimit)
        ? 'Unlimited workspaces'
        : `${workspacesLimit} workspace${workspacesLimit === 1 ? '' : 's'}`,
      used: usage.workspaces_used,
      limit: workspacesLimit,
    },
  ];

  // Hide query meter when unlimited (-1); seeded plans no longer gate on queries.
  if (
    !isUnlimitedLimit(queriesLimit) &&
    (usage.queries_used != null || planLimits?.monthly_query_limit != null)
  ) {
    cards.push({
      key: 'queries',
      label: 'Monthly queries',
      caption: `${queriesLimit.toLocaleString()} queries / month`,
      used: usage.queries_used ?? 0,
      limit: queriesLimit,
    });
  }

  // Always show period AI tokens when we have any signal.
  if (
    usage.llm_tokens_used != null ||
    usage.llm_tokens_limit != null ||
    planLimits?.monthly_llm_token_limit != null
  ) {
    cards.push({
      key: 'tokens',
      label: 'AI tokens',
      caption: isUnlimitedLimit(tokensLimit)
        ? 'Unlimited tokens'
        : `${formatTokenCount(tokensLimit)} tokens / period`,
      used: usage.llm_tokens_used ?? 0,
      limit: tokensLimit,
      resetHint: formatQuotaResetDate(usage.reset_at),
    });
  }

  // Daily meter only when capped (Free trial); hide when -1 (paid).
  if (dailyLimit != null && !isUnlimitedLimit(dailyLimit)) {
    cards.push({
      key: 'daily_tokens',
      label: 'Daily AI tokens',
      caption: `${formatTokenCount(dailyLimit)} tokens / day`,
      used: usage.daily_llm_tokens_used ?? 0,
      limit: dailyLimit,
      resetHint: formatQuotaResetAt(usage.daily_reset_at),
    });
  }

  return cards;
}

function buildPersonalMetrics(
  used: {
    queries: number;
    datasets: number;
    tokens: number;
    dailyTokens?: number;
    workspaces: number;
  },
  limits: {
    queries: number;
    datasets: number;
    tokens: number;
    dailyTokens?: number;
    workspaces: number;
  },
  hints?: {
    periodReset?: string | null;
    dailyReset?: string | null;
  },
): UsageMetricCard[] {
  const cards: UsageMetricCard[] = [];

  if (!isUnlimitedLimit(limits.queries)) {
    cards.push({
      key: 'queries',
      label: 'Query quota',
      caption: `${limits.queries.toLocaleString()} Queries per month`,
      used: used.queries,
      limit: limits.queries,
    });
  }

  cards.push(
    {
      key: 'datasets',
      label: 'Data sources',
      caption: isUnlimitedLimit(limits.datasets)
        ? 'Unlimited files + databases'
        : `${limits.datasets} files + databases`,
      used: used.datasets,
      limit: limits.datasets,
    },
    {
      key: 'tokens',
      label: 'AI tokens',
      caption: isUnlimitedLimit(limits.tokens)
        ? 'Unlimited Tokens per period'
        : `${formatTokenCount(limits.tokens)} Tokens per period`,
      used: used.tokens,
      limit: limits.tokens,
      resetHint: hints?.periodReset,
    },
  );

  if (limits.dailyTokens != null && !isUnlimitedLimit(limits.dailyTokens)) {
    cards.push({
      key: 'daily_tokens',
      label: 'Daily AI tokens',
      caption: `${formatTokenCount(limits.dailyTokens)} tokens / day`,
      used: used.dailyTokens ?? 0,
      limit: limits.dailyTokens,
      resetHint: hints?.dailyReset,
    });
  }

  cards.push({
    key: 'workspaces',
    label: 'Workspaces',
    caption: isUnlimitedLimit(limits.workspaces)
      ? 'Unlimited Workspaces'
      : `${limits.workspaces} Workspace${limits.workspaces === 1 ? '' : 's'}`,
    used: used.workspaces,
    limit: limits.workspaces,
  });

  return cards;
}

export function QuotaUsageGrid({ mode = 'workspace', planLimits = null }: QuotaUsageGridProps) {
  const { workspaceUsage } = useWorkspace();
  const { currentUsage, remaining } = useUsage();

  const metrics = currentUsage?.metrics;
  const plan = currentUsage?.plan;
  const periodReset =
    mode === 'personal'
      ? (currentUsage?.reset_at ?? workspaceUsage?.reset_at)
      : (workspaceUsage?.reset_at ?? currentUsage?.reset_at);
  const resetLabel = formatQuotaResetDate(periodReset);

  const trialSource =
    mode === 'workspace'
      ? workspaceUsage
      : {
          is_trial: currentUsage?.is_trial ?? workspaceUsage?.is_trial,
          trial_end: currentUsage?.trial_end ?? workspaceUsage?.trial_end,
        };
  const daysLeft = trialSource?.is_trial ? trialDaysLeft(trialSource.trial_end) : null;

  let usageMetrics: UsageMetricCard[] = [];

  if (mode === 'personal' && metrics) {
    const limitsSource = planLimits ?? plan?.limits ?? null;
    usageMetrics = buildPersonalMetrics(
      {
        queries: remaining?.queries_used ?? metrics.queries_used,
        datasets: metrics.datasets_used,
        tokens: metrics.llm_tokens_used,
        dailyTokens: metrics.daily_llm_tokens_used,
        workspaces: 1,
      },
      {
        queries: resolveLimit(metrics.queries_limit, limitsSource?.monthly_query_limit),
        datasets: resolveLimit(metrics.datasets_limit, limitsSource?.max_datasets),
        tokens: resolveLimit(metrics.llm_tokens_limit, limitsSource?.monthly_llm_token_limit),
        dailyTokens: metrics.daily_llm_tokens_limit ?? workspaceUsage?.daily_llm_tokens_limit,
        workspaces: resolveLimit(
          undefined,
          limitsSource?.max_workspaces ?? plan?.limits.max_workspaces,
        ),
      },
      {
        periodReset: formatQuotaResetDate(periodReset),
        dailyReset: formatQuotaResetAt(
          currentUsage?.daily_reset_at ?? workspaceUsage?.daily_reset_at,
        ),
      },
    );
  } else if (mode === 'workspace' && workspaceUsage) {
    usageMetrics = buildWorkspaceMetrics(workspaceUsage, planLimits);
  } else if (metrics && plan) {
    const limitsSource = planLimits ?? plan.limits;
    usageMetrics = buildPersonalMetrics(
      {
        queries: remaining?.queries_used ?? metrics.queries_used,
        datasets: metrics.datasets_used,
        tokens: metrics.llm_tokens_used,
        dailyTokens: metrics.daily_llm_tokens_used,
        workspaces: 1,
      },
      {
        queries: resolveLimit(metrics.queries_limit, limitsSource.monthly_query_limit),
        datasets: resolveLimit(metrics.datasets_limit, limitsSource.max_datasets),
        tokens: resolveLimit(metrics.llm_tokens_limit, limitsSource.monthly_llm_token_limit),
        dailyTokens: metrics.daily_llm_tokens_limit,
        workspaces: resolveLimit(undefined, limitsSource.max_workspaces),
      },
      {
        periodReset: formatQuotaResetDate(periodReset),
        dailyReset: formatQuotaResetAt(currentUsage?.daily_reset_at),
      },
    );
  }

  if (usageMetrics.length === 0) return null;

  return (
    <div className="billing-usage-grid">
      {daysLeft != null ? (
        <p className="billing-usage-reset">
          {daysLeft === 0
            ? 'Trial ends today'
            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in trial`}
        </p>
      ) : resetLabel ? (
        <p className="billing-usage-reset">Usage resets on {resetLabel}</p>
      ) : null}
      {usageMetrics.map(({ key, label, caption, used, limit, resetHint }) => {
        const tone = meterTone(used, limit);
        const unlimited = isUnlimitedLimit(limit);
        return (
          <div key={key} className={`billing-usage-card settings-card billing-usage-card--${tone}`}>
            <p className="billing-usage-card__label">{label}</p>
            <p className="billing-usage-card__caption">{caption}</p>
            <div className="billing-usage-card__bar">
              <div
                className={`billing-usage-card__fill billing-usage-card__fill--${tone}`}
                style={{ width: `${unlimited ? 0 : usagePercentage(used, limit)}%` }}
              />
            </div>
            <p className="billing-usage-card__used">
              {unlimited
                ? `Used: ${formatUsageValue(used, key)} / Unlimited`
                : `Used: ${formatUsageValue(used, key)} / Limit: ${formatUsageValue(limit, key)}`}
            </p>
            {resetHint ? (
              <p className="billing-usage-card__caption">
                {key === 'daily_tokens' ? `Resets at ${resetHint}` : `Resets ${resetHint}`}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
