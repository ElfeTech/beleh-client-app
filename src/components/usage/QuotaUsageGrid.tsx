import { useWorkspace } from '../../context/WorkspaceContext';
import { useUsage } from '../../context/UsageContext';
import {
  formatCreditCostUsd,
  formatCreditCount,
  formatQuotaResetAt,
  formatQuotaResetDate,
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
  /** Prefer API remaining; falls back to limit − used when capped. */
  remaining?: number | null;
  /** Optional per-card reset hint (e.g. daily). */
  resetHint?: string | null;
}

function resolveRemaining(
  remaining: number | null | undefined,
  used: number,
  limit: number,
): number | null {
  if (isUnlimitedLimit(limit)) return null;
  if (remaining != null && Number.isFinite(remaining)) return Math.max(0, remaining);
  if (Number.isFinite(used) && Number.isFinite(limit)) return Math.max(0, limit - used);
  return null;
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
  creditCostLine?: string | null,
): UsageMetricCard[] {
  const seatsLimit = resolveLimit(usage.seats_limit, planLimits?.max_members_per_workspace);
  const datasetsLimit = resolveLimit(usage.datasources_limit, planLimits?.max_datasets);
  const workspacesLimit = resolveLimit(usage.workspaces_limit, planLimits?.max_workspaces);
  const queriesLimit = resolveLimit(usage.queries_limit, planLimits?.monthly_query_limit);
  const creditsLimit = resolveLimit(usage.credits_limit, planLimits?.monthly_credit_limit);
  const dailyLimit = usage.daily_credits_limit;
  const creditsUsed = usage.credits_used ?? 0;
  const dailyUsed = usage.daily_credits_used ?? 0;

  const cards: UsageMetricCard[] = [
    {
      key: 'seats',
      label: 'Seats',
      caption: isUnlimitedLimit(seatsLimit) ? 'Unlimited seats' : `${seatsLimit} seats allocated`,
      used: usage.seats_used,
      limit: seatsLimit,
      remaining: resolveRemaining(undefined, usage.seats_used, seatsLimit),
    },
    {
      key: 'datasets',
      label: 'Data sources',
      caption: isUnlimitedLimit(datasetsLimit)
        ? 'Unlimited files + databases'
        : `${datasetsLimit} files + databases allocated`,
      used: usage.datasources_used,
      limit: datasetsLimit,
      remaining: resolveRemaining(undefined, usage.datasources_used, datasetsLimit),
    },
    {
      key: 'workspaces',
      label: 'Workspaces',
      caption: isUnlimitedLimit(workspacesLimit)
        ? 'Unlimited workspaces'
        : `${workspacesLimit} workspace${workspacesLimit === 1 ? '' : 's'} allocated`,
      used: usage.workspaces_used,
      limit: workspacesLimit,
      remaining: resolveRemaining(undefined, usage.workspaces_used, workspacesLimit),
    },
  ];

  // Hide query meter when unlimited (-1); seeded plans no longer gate on queries.
  if (
    !isUnlimitedLimit(queriesLimit) &&
    (usage.queries_used != null || planLimits?.monthly_query_limit != null)
  ) {
    const queriesUsed = usage.queries_used ?? 0;
    cards.push({
      key: 'queries',
      label: 'Monthly queries',
      caption: `${queriesLimit.toLocaleString()} queries / month`,
      used: queriesUsed,
      limit: queriesLimit,
      remaining: resolveRemaining(undefined, queriesUsed, queriesLimit),
    });
  }

  // Always show period AI credits when we have any signal.
  if (
    usage.credits_used != null ||
    usage.credits_limit != null ||
    planLimits?.monthly_credit_limit != null
  ) {
    const baseCaption = isUnlimitedLimit(creditsLimit)
      ? 'Unlimited credits'
      : `${formatCreditCount(creditsLimit)} credits allocated this period`;
    cards.push({
      key: 'credits',
      label: 'AI credits',
      caption: creditCostLine ? `${baseCaption} · ${creditCostLine}` : baseCaption,
      used: creditsUsed,
      limit: creditsLimit,
      remaining: resolveRemaining(usage.credits_remaining, creditsUsed, creditsLimit),
      resetHint: formatQuotaResetDate(usage.reset_at),
    });
  }

  // Daily meter only when capped (Free trial); hide when -1 (paid).
  if (dailyLimit != null && !isUnlimitedLimit(dailyLimit)) {
    cards.push({
      key: 'daily_credits',
      label: 'Daily AI credits',
      caption: `${formatCreditCount(dailyLimit)} credits allocated / day`,
      used: dailyUsed,
      limit: dailyLimit,
      remaining: resolveRemaining(usage.daily_credits_remaining, dailyUsed, dailyLimit),
      resetHint: formatQuotaResetAt(usage.daily_reset_at),
    });
  }

  return cards;
}

function buildPersonalMetrics(
  used: {
    queries: number;
    datasets: number;
    credits: number;
    dailyCredits?: number;
    workspaces: number;
  },
  limits: {
    queries: number;
    datasets: number;
    credits: number;
    dailyCredits?: number;
    workspaces: number;
  },
  remaining?: {
    credits?: number | null;
    dailyCredits?: number | null;
    queries?: number | null;
    datasets?: number | null;
  },
  hints?: {
    periodReset?: string | null;
    dailyReset?: string | null;
    creditCostLine?: string | null;
  },
): UsageMetricCard[] {
  const cards: UsageMetricCard[] = [];

  if (!isUnlimitedLimit(limits.queries)) {
    cards.push({
      key: 'queries',
      label: 'Query quota',
      caption: `${limits.queries.toLocaleString()} queries allocated / month`,
      used: used.queries,
      limit: limits.queries,
      remaining: resolveRemaining(remaining?.queries, used.queries, limits.queries),
    });
  }

  const creditCaption = isUnlimitedLimit(limits.credits)
    ? 'Unlimited credits per period'
    : `${formatCreditCount(limits.credits)} credits allocated this period`;

  cards.push(
    {
      key: 'datasets',
      label: 'Data sources',
      caption: isUnlimitedLimit(limits.datasets)
        ? 'Unlimited files + databases'
        : `${limits.datasets} files + databases allocated`,
      used: used.datasets,
      limit: limits.datasets,
      remaining: resolveRemaining(remaining?.datasets, used.datasets, limits.datasets),
    },
    {
      key: 'credits',
      label: 'AI credits',
      caption: hints?.creditCostLine ? `${creditCaption} · ${hints.creditCostLine}` : creditCaption,
      used: used.credits,
      limit: limits.credits,
      remaining: resolveRemaining(remaining?.credits, used.credits, limits.credits),
      resetHint: hints?.periodReset,
    },
  );

  if (limits.dailyCredits != null && !isUnlimitedLimit(limits.dailyCredits)) {
    cards.push({
      key: 'daily_credits',
      label: 'Daily AI credits',
      caption: `${formatCreditCount(limits.dailyCredits)} credits allocated / day`,
      used: used.dailyCredits ?? 0,
      limit: limits.dailyCredits,
      remaining: resolveRemaining(
        remaining?.dailyCredits,
        used.dailyCredits ?? 0,
        limits.dailyCredits,
      ),
      resetHint: hints?.dailyReset,
    });
  }

  cards.push({
    key: 'workspaces',
    label: 'Workspaces',
    caption: isUnlimitedLimit(limits.workspaces)
      ? 'Unlimited Workspaces'
      : `${limits.workspaces} Workspace${limits.workspaces === 1 ? '' : 's'} allocated`,
    used: used.workspaces,
    limit: limits.workspaces,
    remaining: resolveRemaining(undefined, used.workspaces, limits.workspaces),
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

  const creditCostLine = formatCreditCostUsd(
    remaining?.credit_cost_usd ??
      currentUsage?.credit?.credit_cost_usd ??
      currentUsage?.credit_cost_usd ??
      plan?.credit_cost_usd ??
      workspaceUsage?.credit_cost_usd,
  );

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
        credits: metrics.credits_used,
        dailyCredits: metrics.daily_credits_used,
        workspaces: 1,
      },
      {
        queries: resolveLimit(metrics.queries_limit, limitsSource?.monthly_query_limit),
        datasets: resolveLimit(metrics.datasets_limit, limitsSource?.max_datasets),
        credits: resolveLimit(metrics.credits_limit, limitsSource?.monthly_credit_limit),
        dailyCredits: metrics.daily_credits_limit ?? workspaceUsage?.daily_credits_limit,
        workspaces: resolveLimit(
          undefined,
          limitsSource?.max_workspaces ?? plan?.limits.max_workspaces,
        ),
      },
      {
        credits: remaining?.credits_remaining ?? metrics.credits_remaining,
        dailyCredits:
          remaining?.daily_credits_remaining ??
          metrics.daily_credits_remaining ??
          workspaceUsage?.daily_credits_remaining,
        queries: remaining?.queries_remaining ?? metrics.queries_remaining,
        datasets: metrics.datasets_remaining,
      },
      {
        periodReset: formatQuotaResetDate(periodReset),
        dailyReset: formatQuotaResetAt(
          currentUsage?.daily_reset_at ?? workspaceUsage?.daily_reset_at,
        ),
        creditCostLine,
      },
    );
  } else if (mode === 'workspace' && workspaceUsage) {
    usageMetrics = buildWorkspaceMetrics(workspaceUsage, planLimits, creditCostLine);
  } else if (metrics && plan) {
    const limitsSource = planLimits ?? plan.limits;
    usageMetrics = buildPersonalMetrics(
      {
        queries: remaining?.queries_used ?? metrics.queries_used,
        datasets: metrics.datasets_used,
        credits: metrics.credits_used,
        dailyCredits: metrics.daily_credits_used,
        workspaces: 1,
      },
      {
        queries: resolveLimit(metrics.queries_limit, limitsSource.monthly_query_limit),
        datasets: resolveLimit(metrics.datasets_limit, limitsSource.max_datasets),
        credits: resolveLimit(metrics.credits_limit, limitsSource.monthly_credit_limit),
        dailyCredits: metrics.daily_credits_limit,
        workspaces: resolveLimit(undefined, limitsSource.max_workspaces),
      },
      {
        credits: remaining?.credits_remaining ?? metrics.credits_remaining,
        dailyCredits: remaining?.daily_credits_remaining ?? metrics.daily_credits_remaining,
        queries: remaining?.queries_remaining ?? metrics.queries_remaining,
        datasets: metrics.datasets_remaining,
      },
      {
        periodReset: formatQuotaResetDate(periodReset),
        dailyReset: formatQuotaResetAt(currentUsage?.daily_reset_at),
        creditCostLine,
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
      {usageMetrics.map(({ key, label, caption, used, limit, remaining: left, resetHint }) => {
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
            {unlimited ? (
              <p className="billing-usage-card__used">
                Used: {formatUsageValue(used, key)} · Unlimited
              </p>
            ) : (
              <div className="billing-usage-card__breakdown" aria-label={`${label} breakdown`}>
                <span>
                  <strong>{formatUsageValue(used, key)}</strong> used
                </span>
                <span>
                  <strong>{formatUsageValue(left ?? Math.max(0, limit - used), key)}</strong> left
                </span>
                <span>
                  <strong>{formatUsageValue(limit, key)}</strong> total
                </span>
              </div>
            )}
            {resetHint ? (
              <p className="billing-usage-card__reset-hint">
                {key === 'daily_credits' ? `Resets at ${resetHint}` : `Resets ${resetHint}`}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
