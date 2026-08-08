import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../services/apiClient';
import type {
  CurrentUsageResponse,
  RemainingQuotaResponse,
  UsageSummary,
  QuotaCheckResponse,
  UsageContextValue,
  UsageWarning,
  HistoricalUsageResponse,
} from '../types/usage';

const UsageContext = createContext<UsageContextValue | undefined>(undefined);

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Refresh interval: 2 minutes
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentUsage, setCurrentUsage] = useState<CurrentUsageResponse | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [remaining, setRemaining] = useState<RemainingQuotaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Ref to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const refreshIntervalRef = useRef<number | null>(null);

  // Check if cache is still valid
  const isCacheValid = useCallback(() => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION_MS;
  }, [lastFetched]);

  // Fetch all usage data
  const refreshUsage = useCallback(
    async (force = false) => {
      if (!user) {
        setCurrentUsage(null);
        setSummary(null);
        setRemaining(null);
        setError(null);
        setLastFetched(null);
        return;
      }

      // Prevent duplicate fetches
      if (isFetchingRef.current) {
        return;
      }

      // Use cache if valid (unless force refresh)
      if (!force && isCacheValid()) {
        return;
      }

      try {
        isFetchingRef.current = true;
        setIsLoading(true);
        setError(null);

        const token = await user.getIdToken();

        // Fetch usage data from /api/usage/ endpoint
        const usageData = await apiClient.getCurrentUsage(token);

        setCurrentUsage(usageData);

        // Derive remaining quota from usage data (+ pass through API $ value fields)
        const value = usageData.value;
        const qLimit = usageData.metrics.queries_limit;
        const qUsed = usageData.metrics.queries_used;
        const dLimit = usageData.metrics.datasets_limit;
        const dUsed = usageData.metrics.datasets_used;
        const queriesUnlimited = qLimit < 0;
        const datasetsUnlimited = dLimit < 0;
        const queriesPercentage = queriesUnlimited
          ? 0
          : qLimit > 0
            ? (qUsed / qLimit) * 100
            : qUsed > 0
              ? 100
              : 0;
        const datasetsPercentage = datasetsUnlimited
          ? 0
          : dLimit > 0
            ? (dUsed / dLimit) * 100
            : dUsed > 0
              ? 100
              : 0;

        const tLimit = usageData.metrics.credits_limit;
        const tUsed = usageData.metrics.credits_used;
        const creditsUnlimited = tLimit < 0;
        const creditsPercentage = creditsUnlimited
          ? 0
          : tLimit > 0
            ? (tUsed / tLimit) * 100
            : tUsed > 0
              ? 100
              : 0;
        const dailyLimit = usageData.metrics.daily_credits_limit;
        const dailyUsed = usageData.metrics.daily_credits_used ?? 0;
        const dailyUnlimited = dailyLimit == null || dailyLimit < 0;
        const dailyPercentage = dailyUnlimited
          ? 0
          : dailyLimit > 0
            ? (dailyUsed / dailyLimit) * 100
            : dailyUsed > 0
              ? 100
              : 0;
        // AI gate uses credits (not queries when unlimited).
        const creditMeterPct = Math.max(creditsPercentage, dailyPercentage);
        const canExecuteAi =
          (creditsUnlimited || usageData.metrics.credits_remaining > 0) &&
          (dailyUnlimited || (usageData.metrics.daily_credits_remaining ?? 1) > 0);

        const creditMeta = usageData.credit;
        const derivedRemaining: RemainingQuotaResponse = {
          queries_remaining: usageData.metrics.queries_remaining,
          queries_used: qUsed,
          queries_limit: qLimit,
          percentage_used: queriesUnlimited ? creditMeterPct : queriesPercentage,
          can_execute_query: queriesUnlimited
            ? canExecuteAi
            : usageData.metrics.queries_remaining > 0,
          reset_date: usageData.reset_at,
          credits_remaining: usageData.metrics.credits_remaining,
          daily_credits_remaining: usageData.metrics.daily_credits_remaining,
          daily_credits_limit: dailyLimit,
          tokens_per_credit:
            creditMeta?.tokens_per_credit ??
            usageData.tokens_per_credit ??
            usageData.plan.tokens_per_credit,
          credit_cost_usd:
            creditMeta?.credit_cost_usd ??
            usageData.credit_cost_usd ??
            usageData.plan.credit_cost_usd ??
            null,
          included_value_usd: value?.included_value_usd ?? null,
          used_value_usd: value?.used_value_usd ?? null,
          remaining_value_usd: value?.remaining_value_usd ?? null,
          value_used_pct: value?.value_used_pct ?? null,
          currency: value?.currency ?? creditMeta?.currency ?? 'usd',
          is_unlimited: queriesUnlimited && creditsUnlimited,
        };
        setRemaining(derivedRemaining);

        const warnings: UsageWarning[] = [];

        // Query warnings only when queries are capped (not -1).
        if (!queriesUnlimited && queriesPercentage >= 100) {
          warnings.push({
            level: 'critical',
            message: `You've used all ${qLimit} queries this month. Upgrade to continue.`,
            metric: 'queries',
            percentage: queriesPercentage,
          });
        } else if (!queriesUnlimited && queriesPercentage >= 80) {
          warnings.push({
            level: 'warning',
            message: `You've used ${qUsed} of ${qLimit} queries (${queriesPercentage.toFixed(0)}%).`,
            metric: 'queries',
            percentage: queriesPercentage,
          });
        }

        // Period credit warnings
        if (!creditsUnlimited && creditsPercentage >= 100) {
          warnings.push({
            level: 'critical',
            message: `You've used all credits for this period. Upgrade to continue.`,
            metric: 'credits',
            percentage: creditsPercentage,
          });
        } else if (!creditsUnlimited && creditsPercentage >= 80) {
          warnings.push({
            level: 'warning',
            message: `You've used ${creditsPercentage.toFixed(0)}% of your credit quota.`,
            metric: 'credits',
            percentage: creditsPercentage,
          });
        }

        // Daily credit warnings (Free trial)
        if (!dailyUnlimited && dailyPercentage >= 100) {
          warnings.push({
            level: 'critical',
            message: `You've reached today's credit limit. It resets at midnight UTC.`,
            metric: 'daily_credits',
            percentage: dailyPercentage,
          });
        } else if (!dailyUnlimited && dailyPercentage >= 80) {
          warnings.push({
            level: 'warning',
            message: `You've used ${dailyPercentage.toFixed(0)}% of today's credit allowance.`,
            metric: 'daily_credits',
            percentage: dailyPercentage,
          });
        }

        // Dataset warnings
        if (!datasetsUnlimited && datasetsPercentage >= 100) {
          warnings.push({
            level: 'critical',
            message: `You've reached your dataset limit of ${dLimit}. Upgrade to add more.`,
            metric: 'datasources',
            percentage: datasetsPercentage,
          });
        } else if (!datasetsUnlimited && datasetsPercentage >= 80) {
          warnings.push({
            level: 'warning',
            message: `You've used ${dUsed} of ${dLimit} datasets.`,
            metric: 'datasources',
            percentage: datasetsPercentage,
          });
        }

        const derivedSummary: UsageSummary = {
          queries_percentage: queriesPercentage,
          datasources_percentage: datasetsPercentage,
          members_percentage: 0, // Seat usage is on GET /workspaces/{id}/usage
          plan_name: usageData.plan.name,
          reset_date: usageData.reset_at,
          warnings,
          remaining_value_usd: value?.remaining_value_usd ?? null,
          value_used_pct: value?.value_used_pct ?? null,
          included_value_usd: value?.included_value_usd ?? null,
          used_value_usd: value?.used_value_usd ?? null,
          currency: value?.currency ?? 'usd',
        };
        setSummary(derivedSummary);

        setLastFetched(Date.now());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch usage data';
        console.error('[Usage] Error fetching usage data:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [user, isCacheValid],
  );

  // Optimistic update - immediately decrement query count for instant UI feedback
  const decrementQueryCount = useCallback(() => {
    if (currentUsage) {
      const qLimit = currentUsage.metrics.queries_limit;
      const queriesUnlimited = qLimit < 0;
      const updatedUsage = {
        ...currentUsage,
        metrics: {
          ...currentUsage.metrics,
          queries_used: currentUsage.metrics.queries_used + 1,
          queries_remaining: Math.max(0, currentUsage.metrics.queries_remaining - 1),
        },
      };
      setCurrentUsage(updatedUsage);

      const queriesRemaining = updatedUsage.metrics.queries_remaining;
      if (remaining) {
        setRemaining({
          ...remaining,
          queries_remaining: queriesRemaining,
          queries_used: updatedUsage.metrics.queries_used,
          percentage_used: queriesUnlimited
            ? remaining.percentage_used
            : qLimit > 0
              ? (updatedUsage.metrics.queries_used / qLimit) * 100
              : 100,
          can_execute_query: queriesUnlimited ? remaining.can_execute_query : queriesRemaining > 0,
        });
      }
    }
  }, [currentUsage, remaining]);

  // Immediate refresh after user action (bypasses cache) - call this after chat/upload
  const refreshUsageAfterAction = useCallback(async () => {
    // Force refresh to bypass cache
    await refreshUsage(true);
  }, [refreshUsage]);

  // Check quota for specific operation
  const checkQuota = useCallback(
    async (operation: 'query' | 'datasource' | 'member'): Promise<QuotaCheckResponse> => {
      if (!user) {
        return {
          allowed: false,
          reason: 'User not authenticated',
          current_usage: 0,
          limit: 0,
          percentage_used: 0,
        };
      }

      try {
        const token = await user.getIdToken();
        const response = await apiClient.checkQuota(token, operation);

        // If quota check succeeded, refresh usage data in background
        if (!response.allowed) {
          refreshUsage();
        }

        return response;
      } catch (err) {
        console.error(`[Usage] Error checking quota for ${operation}:`, err);
        return {
          allowed: false,
          reason: 'Failed to check quota',
          current_usage: 0,
          limit: 0,
          percentage_used: 0,
        };
      }
    },
    [user, refreshUsage],
  );

  // Check if there's a warning at specific level
  const hasWarning = useCallback(
    (level: 'warning' | 'critical'): boolean => {
      if (!summary?.warnings) return false;
      return summary.warnings.some(
        (w) => w.level === level || (level === 'warning' && w.level === 'critical'),
      );
    },
    [summary],
  );

  // Derived value: can execute query
  const canExecuteQuery = remaining?.can_execute_query ?? true;

  // Get historical usage data
  const getHistoricalUsage = useCallback(
    async (days: number = 30, workspaceId?: string): Promise<HistoricalUsageResponse | null> => {
      if (!user) return null;
      try {
        const token = await user.getIdToken();
        return await apiClient.getHistoricalUsage(token, workspaceId, days);
      } catch (err) {
        console.error('[Usage] Error fetching historical usage:', err);
        return null;
      }
    },
    [user],
  );

  // Initial fetch when user authenticates
  useEffect(() => {
    if (user) {
      refreshUsage();
    }
  }, [user, refreshUsage]);

  // Set up periodic refresh
  useEffect(() => {
    if (!user) {
      // Clear interval if user logs out
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Set up interval for periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      refreshUsage();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user, refreshUsage]);

  return (
    <UsageContext.Provider
      value={{
        currentUsage,
        summary,
        remaining,
        isLoading,
        error,
        lastFetched,
        refreshUsage,
        checkQuota,
        hasWarning,
        getHistoricalUsage,
        canExecuteQuery,
        decrementQueryCount,
        refreshUsageAfterAction,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
}

export { UsageContext };

export function useUsage() {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}
