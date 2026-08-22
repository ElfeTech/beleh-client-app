import type { AssistantTurnResponse, UiArtifact } from '../types/api';
import {
  asChartData,
  asErrorData,
  asInsightData,
  asKpiData,
  asScatterData,
  asTableData,
  isCategoryChartType,
  isChartArtifactType,
  isScatterArtifactType,
  isValidCategoryChartData,
  isValidScatterData,
} from './artifactAdapters';
import {
  isNetworkFetchError,
  isQuotaExceededError,
  NETWORK_ERROR_MESSAGE,
} from './apiErrorMessage';
import { formatQuotaResetAt, formatQuotaResetDate } from './formatters';
import { normalizeBillingUpgradeHref } from './workspaceAccess';

export interface WorkflowFailureInfo {
  title: string;
  detail: string;
  canRetry: boolean;
  /** When set, failure is a plan quota block. */
  quotaLimitType?: string;
  upgradeHref?: string | null;
  showUpgradeCta?: boolean;
}

function findErrorArtifact(artifacts: UiArtifact[]): UiArtifact | undefined {
  return artifacts.find((a) => a.type === 'error');
}

function hasUsableSuccessContent(response: AssistantTurnResponse): boolean {
  const text = response.text?.trim() ?? '';
  if (text) return true;

  for (const a of response.artifacts ?? []) {
    if (a.type === 'kpi') {
      if (asKpiData(a.data).metrics.length > 0) return true;
      continue;
    }
    if (a.type === 'insight') {
      if (asInsightData(a.data).bullets.length > 0) return true;
      continue;
    }
    if (a.type === 'table') {
      const t = asTableData(a.data);
      if (t.columns.length > 0 && t.rows.length > 0) return true;
      continue;
    }
    if (isScatterArtifactType(a.type)) {
      if (isValidScatterData(asScatterData(a.data))) return true;
      continue;
    }
    if (isCategoryChartType(a.type) || isChartArtifactType(a.type)) {
      if (isValidCategoryChartData(asChartData(a.data))) return true;
    }
  }
  return false;
}

export function getWorkflowFailure(response: AssistantTurnResponse): WorkflowFailureInfo | null {
  const artifacts = response.artifacts ?? [];
  const errorArt = findErrorArtifact(artifacts);

  // Partial multi-panel failure: keep rendering when other panels succeeded.
  if (errorArt && hasUsableSuccessContent(response)) {
    return null;
  }

  if (errorArt) {
    const { message } = asErrorData(errorArt.data);
    return {
      title: errorArt.title || 'Analysis could not be completed',
      detail: message || 'The prompt failed on the server. Check your data source and try again.',
      canRetry: true,
    };
  }

  const text = response.text?.trim() ?? '';
  const usable = artifacts.filter((a) => a.type !== 'error');
  if (!text && usable.length === 0) {
    return {
      title: 'No response from analysis',
      detail:
        'The server returned an empty result. Your question may need a different wording or data source.',
      canRetry: true,
    };
  }

  return null;
}

export function formatChatRequestError(err: unknown): WorkflowFailureInfo {
  if (isQuotaExceededError(err)) {
    const isDaily = err.quota.limit_type === 'daily_credits';
    const resetLabel = isDaily
      ? formatQuotaResetAt(err.quota.reset_at)
      : formatQuotaResetDate(err.quota.reset_at);
    const detailParts = [err.message];
    if (isDaily && resetLabel) {
      detailParts.push(`Daily limit reached , resets at ${resetLabel}.`);
    } else if (
      (err.quota.limit_type === 'queries' || err.quota.limit_type === 'credits') &&
      resetLabel
    ) {
      detailParts.push(`Resets on ${resetLabel}.`);
    }
    return {
      title: isDaily ? 'Daily limit reached' : 'Plan limit reached',
      detail: detailParts.join(' '),
      canRetry: false,
      quotaLimitType: err.quota.limit_type,
      upgradeHref: normalizeBillingUpgradeHref(err.quota.upgrade_url),
      // Daily cap is not upgrade-only; GenerativeChat may still override by role.
      showUpgradeCta: !isDaily,
    };
  }
  if (isNetworkFetchError(err)) {
    return {
      title: 'Connection lost',
      detail: NETWORK_ERROR_MESSAGE,
      canRetry: true,
    };
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg === NETWORK_ERROR_MESSAGE) {
      return {
        title: 'Connection lost',
        detail: NETWORK_ERROR_MESSAGE,
        canRetry: true,
      };
    }
    if (msg.includes('Authentication') || msg.includes('sign in')) {
      return {
        title: 'Session expired',
        detail: msg,
        canRetry: false,
      };
    }
    return {
      title: 'Request failed',
      detail: msg || 'Something went wrong while contacting the server.',
      canRetry: true,
    };
  }
  return {
    title: 'Request failed',
    detail: 'Something went wrong. Please check your connection and try again.',
    canRetry: true,
  };
}
