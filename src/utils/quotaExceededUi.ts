import type { QuotaLimitType, WorkspaceRole } from '../types/api';
import { formatQuotaResetAt, formatQuotaResetDate } from './formatters';
import { canShowWorkspaceUpgradeCta, PLAN_MANAGED_BY_OWNER_COPY } from './workspaceAccess';
import type { QuotaExceededError } from './apiErrorMessage';

export type QuotaExceededCta = {
  label: string;
  /** In-app path (preferred) or absolute/relative upgrade URL. */
  href: string;
  /** When false, only show message (members cannot upgrade / daily reset has no upgrade CTA). */
  showCta: boolean;
};

export function formatQuotaExceededAction(
  limitType: QuotaLimitType,
  role: WorkspaceRole | null | undefined,
  options?: {
    workspaceId?: string | null;
    upgradeUrl?: string | null;
    resetAt?: string | null;
  },
): QuotaExceededCta {
  const canUpgrade = canShowWorkspaceUpgradeCta(role);
  const billingHref = options?.upgradeUrl?.trim() || '/settings/billing?upgrade=1';
  const datasetsHref = options?.workspaceId
    ? `/workspace/${options.workspaceId}/datasets`
    : '/datasets';

  switch (limitType) {
    case 'members_per_workspace':
      return canUpgrade
        ? { label: 'Manage members', href: '/settings/members', showCta: true }
        : { label: 'Ask owner', href: '/settings/members', showCta: false };
    case 'datasets':
      return canUpgrade
        ? { label: 'View datasources', href: datasetsHref, showCta: true }
        : { label: 'View datasources', href: datasetsHref, showCta: true };
    case 'workspaces':
      return canUpgrade
        ? { label: 'Upgrade plan', href: billingHref, showCta: true }
        : { label: 'Ask owner', href: billingHref, showCta: false };
    case 'daily_credits':
      // Daily cap: inform about reset , not upgrade-only.
      return { label: 'OK', href: '#', showCta: false };
    case 'credits':
    case 'queries':
    default:
      return canUpgrade
        ? { label: 'Upgrade plan', href: billingHref, showCta: true }
        : { label: 'Ask owner', href: billingHref, showCta: false };
  }
}

export function formatQuotaExceededMessage(
  error: QuotaExceededError,
  role: WorkspaceRole | null | undefined,
): string {
  const base = error.quota.message?.trim() || error.message;
  const parts = [base];

  if (error.quota.limit_type === 'daily_credits') {
    const resetAt = formatQuotaResetAt(error.quota.reset_at);
    if (resetAt) {
      parts.push(`Daily limit reached , resets at ${resetAt}.`);
    } else {
      parts.push('Daily credit limit reached. Try again after the daily reset.');
    }
  } else if (
    (error.quota.limit_type === 'credits' || error.quota.limit_type === 'queries') &&
    formatQuotaResetDate(error.quota.reset_at)
  ) {
    parts.push(`Resets on ${formatQuotaResetDate(error.quota.reset_at)}.`);
  }

  if (error.quota.limit_type !== 'daily_credits' && !canShowWorkspaceUpgradeCta(role)) {
    parts.push(PLAN_MANAGED_BY_OWNER_COPY);
  }

  return parts.join(' ');
}
