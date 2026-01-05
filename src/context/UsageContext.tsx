import { createContext, useState, useContext, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { apiClient } from '../services/apiClient';
import type {
  CurrentUsageResponse,
  RemainingQuotaResponse,
  UsageSummary,
  QuotaCheckResponse,
  UsageContextValue,
  UsageWarning,
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
  const refreshUsage = useCallback(async (force = false) => {
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

      // Derive remaining quota from usage data
      const derivedRemaining: RemainingQuotaResponse = {
        queries_remaining: usageData.metrics.queries_remaining,
        queries_used: usageData.metrics.queries_used,
        queries_limit: usageData.metrics.queries_limit,
        percentage_used: (usageData.metrics.queries_used / usageData.metrics.queries_limit) * 100,
        can_execute_query: usageData.metrics.queries_remaining > 0,
        reset_date: usageData.reset_at,
      };
      setRemaining(derivedRemaining);

      // Derive summary with warnings
      const queriesPercentage = (usageData.metrics.queries_used / usageData.metrics.queries_limit) * 100;
      const datasetsPercentage = (usageData.metrics.datasets_used / usageData.metrics.datasets_limit) * 100;

      const warnings: UsageWarning[] = [];

      // Query warnings
      if (queriesPercentage >= 100) {
        warnings.push({
          level: 'critical',
          message: `You've used all ${usageData.metrics.queries_limit} queries this month. Upgrade to continue.`,
          metric: 'queries',
          percentage: queriesPercentage,
        });
      } else if (queriesPercentage >= 90) {
        warnings.push({
          level: 'critical',
          message: `You've used ${usageData.metrics.queries_used} of ${usageData.metrics.queries_limit} queries (${queriesPercentage.toFixed(0)}%). Only ${usageData.metrics.queries_remaining} remaining.`,
          metric: 'queries',
          percentage: queriesPercentage,
        });
      } else if (queriesPercentage >= 70) {
        warnings.push({
          level: 'warning',
          message: `You've used ${queriesPercentage.toFixed(0)}% of your monthly queries. Consider upgrading for more capacity.`,
          metric: 'queries',
          percentage: queriesPercentage,
        });
      }

      // Dataset warnings
      if (datasetsPercentage >= 100) {
        warnings.push({
          level: 'critical',
          message: `You've reached your dataset limit of ${usageData.metrics.datasets_limit}. Upgrade to add more.`,
          metric: 'datasources',
          percentage: datasetsPercentage,
        });
      } else if (datasetsPercentage >= 80) {
        warnings.push({
          level: 'warning',
          message: `You've used ${usageData.metrics.datasets_used} of ${usageData.metrics.datasets_limit} datasets.`,
          metric: 'datasources',
          percentage: datasetsPercentage,
        });
      }

      const derivedSummary: UsageSummary = {
        queries_percentage: queriesPercentage,
        datasources_percentage: datasetsPercentage,
        members_percentage: 0, // Not tracked in current API
        plan_name: usageData.plan.name,
        reset_date: usageData.reset_at,
        warnings,
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
  }, [user, isCacheValid]);

  // Optimistic update - immediately decrement query count for instant UI feedback
  const decrementQueryCount = useCallback(() => {
    if (currentUsage) {
      const updatedUsage = {
        ...currentUsage,
        metrics: {
          ...currentUsage.metrics,
          queries_used: currentUsage.metrics.queries_used + 1,
          queries_remaining: Math.max(0, currentUsage.metrics.queries_remaining - 1),
        },
      };
      setCurrentUsage(updatedUsage);

      // Update remaining
      const queriesRemaining = updatedUsage.metrics.queries_remaining;
      if (remaining) {
        setRemaining({
          ...remaining,
          queries_remaining: queriesRemaining,
          queries_used: updatedUsage.metrics.queries_used,
          percentage_used: (updatedUsage.metrics.queries_used / updatedUsage.metrics.queries_limit) * 100,
          can_execute_query: queriesRemaining > 0,
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
    [user, refreshUsage]
  );

  // Check if there's a warning at specific level
  const hasWarning = useCallback(
    (level: 'warning' | 'critical'): boolean => {
      if (!summary?.warnings) return false;
      return summary.warnings.some((w) => w.level === level || (level === 'warning' && w.level === 'critical'));
    },
    [summary]
  );

  // Derived value: can execute query
  const canExecuteQuery = remaining?.can_execute_query ?? true;

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
