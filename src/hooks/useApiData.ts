/**
 * Optimized Data Fetching Hooks
 *
 * These hooks provide a unified interface for fetching data with automatic
 * caching, deduplication, and loading states. They integrate with the
 * ApiCacheManager to ensure no endpoint is called multiple times.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCacheManager, type CacheConfig } from '../utils/apiCacheManager';

export interface UseApiDataOptions<T> extends CacheConfig {
    /**
     * If true, data will be fetched immediately when the hook is mounted
     */
    immediate?: boolean;

    /**
     * Callback when data is successfully fetched
     */
    onSuccess?: (data: T) => void;

    /**
     * Callback when an error occurs
     */
    onError?: (error: Error) => void;

    /**
     * If provided, the hook will automatically refetch when these dependencies change
     */
    dependencies?: any[];
}

export interface UseApiDataResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<T | null>;
    invalidate: () => void;
}

/**
 * Generic hook for fetching data with caching and deduplication
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApiData(
 *   'datasources',
 *   () => apiClient.listWorkspaceDatasources(token, workspaceId),
 *   [token, workspaceId],
 *   { immediate: true }
 * );
 * ```
 */
export function useApiData<T>(
    endpoint: string,
    fetchFn: (...args: any[]) => Promise<T>,
    args: any[] = [],
    options: UseApiDataOptions<T> = {}
): UseApiDataResult<T> {
    const {
        immediate = false,
        onSuccess,
        onError,
        dependencies = [],
        ...cacheConfig
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState<Error | null>(null);

    // Use ref to track if component is mounted (prevent state updates after unmount)
    const isMountedRef = useRef(true);

    // Use ref to track the latest args to avoid stale closures
    const argsRef = useRef(args);
    argsRef.current = args;

    const fetchData = useCallback(async (): Promise<T | null> => {
        setLoading(true);
        setError(null);

        try {
            const result = await apiCacheManager.fetch(
                endpoint,
                fetchFn,
                argsRef.current,
                cacheConfig
            );

            if (isMountedRef.current) {
                setData(result);
                setLoading(false);
                onSuccess?.(result);
            }

            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));

            if (isMountedRef.current) {
                setError(error);
                setLoading(false);
                onError?.(error);
            }

            return null;
        }
    }, [endpoint, fetchFn, cacheConfig, onSuccess, onError]);

    const invalidate = useCallback(() => {
        apiCacheManager.invalidate(endpoint, argsRef.current);
    }, [endpoint]);

    // Fetch on mount if immediate is true
    useEffect(() => {
        if (immediate) {
            fetchData();
        }
    }, [immediate, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
        invalidate,
    };
}

/**
 * Hook for fetching sessions for a datasource
 *
 * @example
 * ```tsx
 * const { sessions, loading, refresh } = useSessions(datasourceId);
 * ```
 */
export function useSessions(datasourceId: string | null) {
    const { data, loading, error, refetch, invalidate } = useApiData(
        'sessions',
        async (token: string, dsId: string) => {
            const { apiClient } = await import('../services/apiClient');
            const response = await apiClient.listChatSessions(token, dsId);
            return response.items;
        },
        datasourceId ? [datasourceId] : [],
        {
            immediate: !!datasourceId,
            dependencies: [datasourceId],
        }
    );

    return {
        sessions: data || [],
        loading,
        error,
        refresh: refetch,
        invalidate,
    };
}

/**
 * Hook for fetching messages for a session
 *
 * @example
 * ```tsx
 * const { messages, loading, loadMore, hasMore } = useMessages(sessionId);
 * ```
 */
export function useMessages(sessionId: string | null, initialPage: number = 1) {
    const [page, setPage] = useState(initialPage);
    const [allMessages, setAllMessages] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(false);

    const { loading, error, refetch } = useApiData(
        'messages',
        async (token: string, sId: string, p: number) => {
            const { apiClient } = await import('../services/apiClient');
            return apiClient.getSessionMessagesPaginated(token, sId, { page: p, page_size: 20 });
        },
        sessionId ? [sessionId, page] : [],
        {
            immediate: !!sessionId,
            dependencies: [sessionId, page],
            onSuccess: (response) => {
                setHasMore(response.has_next);
                if (page === 1) {
                    setAllMessages(response.items);
                } else {
                    setAllMessages(prev => [...response.items, ...prev]);
                }
            },
        }
    );

    const loadMore = useCallback(() => {
        if (hasMore && !loading) {
            setPage(prev => prev + 1);
        }
    }, [hasMore, loading]);

    const reset = useCallback(() => {
        setPage(1);
        setAllMessages([]);
        setHasMore(false);
    }, []);

    return {
        messages: allMessages,
        loading,
        error,
        hasMore,
        loadMore,
        reset,
        refetch,
    };
}

/**
 * Hook for fetching datasources for a workspace
 *
 * @example
 * ```tsx
 * const { datasources, loading, refresh } = useDatasources(workspaceId);
 * ```
 */
export function useDatasources(workspaceId: string | null) {
    const { data, loading, error, refetch, invalidate } = useApiData(
        'datasources',
        async (token: string, wId: string) => {
            const { apiClient } = await import('../services/apiClient');
            const response = await apiClient.listWorkspaceDatasources(token, wId);
            return response.items;
        },
        workspaceId ? [workspaceId] : [],
        {
            immediate: !!workspaceId,
            dependencies: [workspaceId],
        }
    );

    return {
        datasources: data || [],
        loading,
        error,
        refresh: refetch,
        invalidate,
    };
}

/**
 * Hook for fetching workspace context (state + metadata)
 *
 * @example
 * ```tsx
 * const { context, loading, refresh } = useWorkspaceContext(workspaceId);
 * ```
 */
export function useWorkspaceContext(workspaceId: string | null) {
    const { data, loading, error, refetch, invalidate } = useApiData(
        'workspace-context',
        async (token: string, wId: string) => {
            const { apiClient } = await import('../services/apiClient');
            return apiClient.getWorkspaceContext(token, wId);
        },
        workspaceId ? [workspaceId] : [],
        {
            immediate: !!workspaceId,
            dependencies: [workspaceId],
        }
    );

    return {
        context: data,
        loading,
        error,
        refresh: refetch,
        invalidate,
    };
}

/**
 * Hook for fetching workspaces list
 *
 * @example
 * ```tsx
 * const { workspaces, loading, refresh } = useWorkspaces();
 * ```
 */
export function useWorkspaces() {
    const { data, loading, error, refetch, invalidate } = useApiData(
        'workspaces',
        async (token: string) => {
            const { apiClient } = await import('../services/apiClient');
            const response = await apiClient.listWorkspaces(token);
            return response.items;
        },
        [],
        {
            immediate: false, // Will be triggered manually with token
        }
    );

    return {
        workspaces: data || [],
        loading,
        error,
        refresh: refetch,
        invalidate,
    };
}

/**
 * Hook for fetching usage data
 *
 * @example
 * ```tsx
 * const { usage, loading, refresh } = useUsageData();
 * ```
 */
export function useUsageData() {
    const { data, loading, error, refetch, invalidate } = useApiData(
        'usage',
        async (token: string) => {
            const { apiClient } = await import('../services/apiClient');
            return apiClient.getCurrentUsage(token);
        },
        [],
        {
            immediate: false, // Will be triggered manually with token
        }
    );

    return {
        usage: data,
        loading,
        error,
        refresh: refetch,
        invalidate,
    };
}
