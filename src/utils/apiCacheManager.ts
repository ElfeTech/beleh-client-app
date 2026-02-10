/**
 * Unified API Cache Manager
 *
 * This utility provides centralized caching, deduplication, and request optimization
 * for all API calls in the application. It ensures that:
 * 1. No endpoint is called multiple times simultaneously
 * 2. Responses are cached with configurable TTL
 * 3. Stale data is automatically refreshed in the background
 * 4. Request cancellation is supported for cleanup
 */

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export interface CacheConfig {
    ttl?: number; // Time-to-live in milliseconds (default: 5 minutes)
    staleWhileRevalidate?: boolean; // Return stale data while fetching fresh (default: true)
    deduplicate?: boolean; // Prevent duplicate in-flight requests (default: true)
}

export interface FetchFunction<T> {
    (...args: any[]): Promise<T>;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CONFIG: Required<CacheConfig> = {
    ttl: DEFAULT_TTL,
    staleWhileRevalidate: true,
    deduplicate: true,
};

class ApiCacheManager {
    // Cache storage: endpoint -> cacheKey -> data
    private cache = new Map<string, Map<string, CacheEntry<any>>>();

    // In-flight requests: endpoint -> cacheKey -> Promise
    private pendingRequests = new Map<string, Map<string, Promise<any>>>();

    // Endpoint configurations
    private configs = new Map<string, Required<CacheConfig>>();

    // AbortControllers for cancellable requests
    private abortControllers = new Map<string, Map<string, AbortController>>();

    /**
     * Configure caching behavior for a specific endpoint
     */
    configure(endpoint: string, config: CacheConfig): void {
        this.configs.set(endpoint, { ...DEFAULT_CONFIG, ...config });
    }

    /**
     * Generate a cache key from function arguments
     */
    private generateCacheKey(args: any[]): string {
        return JSON.stringify(args);
    }

    /**
     * Get cached data if available and not expired
     */
    private getCached<T>(endpoint: string, cacheKey: string, config: Required<CacheConfig>): CacheEntry<T> | null {
        const endpointCache = this.cache.get(endpoint);
        if (!endpointCache) return null;

        const entry = endpointCache.get(cacheKey);
        if (!entry) return null;

        const now = Date.now();

        // If not expired, return cached data
        if (now < entry.expiresAt) {
            return entry;
        }

        // If staleWhileRevalidate is enabled and data is stale, return it anyway
        // (caller will trigger background refresh)
        if (config.staleWhileRevalidate) {
            return entry;
        }

        // Data is expired and staleWhileRevalidate is disabled
        endpointCache.delete(cacheKey);
        return null;
    }

    /**
     * Store data in cache
     */
    private setCache<T>(endpoint: string, cacheKey: string, data: T, ttl: number): void {
        let endpointCache = this.cache.get(endpoint);
        if (!endpointCache) {
            endpointCache = new Map();
            this.cache.set(endpoint, endpointCache);
        }

        const now = Date.now();
        endpointCache.set(cacheKey, {
            data,
            timestamp: now,
            expiresAt: now + ttl,
        });
    }

    /**
     * Get or create a pending request
     */
    private getPendingRequest<T>(endpoint: string, cacheKey: string): Promise<T> | null {
        const endpointPending = this.pendingRequests.get(endpoint);
        if (!endpointPending) return null;
        return endpointPending.get(cacheKey) || null;
    }

    /**
     * Store a pending request
     */
    private setPendingRequest<T>(endpoint: string, cacheKey: string, promise: Promise<T>): void {
        let endpointPending = this.pendingRequests.get(endpoint);
        if (!endpointPending) {
            endpointPending = new Map();
            this.pendingRequests.set(endpoint, endpointPending);
        }
        endpointPending.set(cacheKey, promise);
    }

    /**
     * Remove a pending request
     */
    private removePendingRequest(endpoint: string, cacheKey: string): void {
        const endpointPending = this.pendingRequests.get(endpoint);
        if (endpointPending) {
            endpointPending.delete(cacheKey);
            if (endpointPending.size === 0) {
                this.pendingRequests.delete(endpoint);
            }
        }
    }

    /**
     * Create an AbortController for a request
     */
    private createAbortController(endpoint: string, cacheKey: string): AbortController {
        let endpointControllers = this.abortControllers.get(endpoint);
        if (!endpointControllers) {
            endpointControllers = new Map();
            this.abortControllers.set(endpoint, endpointControllers);
        }

        const controller = new AbortController();
        endpointControllers.set(cacheKey, controller);
        return controller;
    }

    /**
     * Remove an AbortController
     */
    private removeAbortController(endpoint: string, cacheKey: string): void {
        const endpointControllers = this.abortControllers.get(endpoint);
        if (endpointControllers) {
            endpointControllers.delete(cacheKey);
            if (endpointControllers.size === 0) {
                this.abortControllers.delete(endpoint);
            }
        }
    }

    /**
     * Fetch data with caching, deduplication, and stale-while-revalidate support
     *
     * @param endpoint - Unique identifier for this API endpoint
     * @param fetchFn - Function that performs the actual API call
     * @param args - Arguments to pass to fetchFn (used for cache key generation)
     * @param options - Override default cache configuration
     */
    async fetch<T>(
        endpoint: string,
        fetchFn: FetchFunction<T>,
        args: any[] = [],
        options?: CacheConfig
    ): Promise<T> {
        const config = {
            ...DEFAULT_CONFIG,
            ...this.configs.get(endpoint),
            ...options
        };

        const cacheKey = this.generateCacheKey(args);

        // Check cache first
        const cached = this.getCached<T>(endpoint, cacheKey, config);
        if (cached) {
            const now = Date.now();
            const isStale = now >= cached.expiresAt;

            if (!isStale) {
                // Data is fresh, return immediately
                console.log(`[ApiCacheManager] Cache HIT (fresh) for ${endpoint}`, { cacheKey });
                return cached.data;
            }

            if (config.staleWhileRevalidate && isStale) {
                // Data is stale but we'll return it and refresh in background
                console.log(`[ApiCacheManager] Cache HIT (stale, revalidating) for ${endpoint}`, { cacheKey });

                // Trigger background refresh (don't await)
                this.refreshInBackground(endpoint, fetchFn, args, cacheKey, config);

                return cached.data;
            }
        }

        // Check for in-flight request (deduplication)
        if (config.deduplicate) {
            const pending = this.getPendingRequest<T>(endpoint, cacheKey);
            if (pending) {
                console.log(`[ApiCacheManager] Request DEDUPLICATED for ${endpoint}`, { cacheKey });
                return pending;
            }
        }

        // No cache hit and no pending request - make new request
        console.log(`[ApiCacheManager] Cache MISS for ${endpoint}, fetching...`, { cacheKey });
        return this.executeRequest(endpoint, fetchFn, args, cacheKey, config);
    }

    /**
     * Execute the actual API request
     */
    private async executeRequest<T>(
        endpoint: string,
        fetchFn: FetchFunction<T>,
        args: any[],
        cacheKey: string,
        config: Required<CacheConfig>
    ): Promise<T> {
        const abortController = this.createAbortController(endpoint, cacheKey);

        const requestPromise = (async (): Promise<T> => {
            try {
                const data = await fetchFn(...args, abortController.signal);

                // Store in cache
                this.setCache(endpoint, cacheKey, data, config.ttl);

                return data;
            } catch (error) {
                // If request was aborted, don't log as error
                if (error instanceof Error && error.name === 'AbortError') {
                    console.log(`[ApiCacheManager] Request aborted for ${endpoint}`, { cacheKey });
                } else {
                    console.error(`[ApiCacheManager] Request failed for ${endpoint}:`, error);
                }
                throw error;
            } finally {
                this.removePendingRequest(endpoint, cacheKey);
                this.removeAbortController(endpoint, cacheKey);
            }
        })();

        // Store pending request for deduplication
        if (config.deduplicate) {
            this.setPendingRequest(endpoint, cacheKey, requestPromise);
        }

        return requestPromise;
    }

    /**
     * Refresh data in the background without blocking
     */
    private refreshInBackground<T>(
        endpoint: string,
        fetchFn: FetchFunction<T>,
        args: any[],
        cacheKey: string,
        config: Required<CacheConfig>
    ): void {
        // Don't wait for this - it runs in background
        this.executeRequest(endpoint, fetchFn, args, cacheKey, config).catch(error => {
            console.warn(`[ApiCacheManager] Background refresh failed for ${endpoint}:`, error);
        });
    }

    /**
     * Invalidate cache for a specific endpoint and cache key
     */
    invalidate(endpoint: string, args: any[] = []): void {
        const cacheKey = this.generateCacheKey(args);
        const endpointCache = this.cache.get(endpoint);
        if (endpointCache) {
            endpointCache.delete(cacheKey);
            console.log(`[ApiCacheManager] Cache invalidated for ${endpoint}`, { cacheKey });
        }
    }

    /**
     * Invalidate all cache entries for an endpoint
     */
    invalidateAll(endpoint: string): void {
        this.cache.delete(endpoint);
        console.log(`[ApiCacheManager] All cache invalidated for ${endpoint}`);
    }

    /**
     * Cancel all pending requests for an endpoint
     */
    cancelPending(endpoint: string): void {
        const endpointControllers = this.abortControllers.get(endpoint);
        if (endpointControllers) {
            endpointControllers.forEach(controller => controller.abort());
            this.abortControllers.delete(endpoint);
            console.log(`[ApiCacheManager] Cancelled pending requests for ${endpoint}`);
        }
    }

    /**
     * Clear all cache and pending requests
     */
    clearAll(): void {
        this.cache.clear();
        this.pendingRequests.clear();

        // Abort all pending requests
        this.abortControllers.forEach(endpointControllers => {
            endpointControllers.forEach(controller => controller.abort());
        });
        this.abortControllers.clear();

        console.log('[ApiCacheManager] All cache and pending requests cleared');
    }

    /**
     * Get cache statistics for debugging
     */
    getStats() {
        const stats = {
            endpoints: Array.from(this.cache.keys()),
            totalCachedEntries: 0,
            pendingRequests: 0,
            cacheDetails: {} as Record<string, { entries: number; pending: number }>,
        };

        this.cache.forEach((endpointCache, endpoint) => {
            stats.totalCachedEntries += endpointCache.size;
            const pending = this.pendingRequests.get(endpoint)?.size || 0;
            stats.pendingRequests += pending;
            stats.cacheDetails[endpoint] = {
                entries: endpointCache.size,
                pending,
            };
        });

        return stats;
    }
}

// Export singleton instance
export const apiCacheManager = new ApiCacheManager();

// Configure default cache settings for common endpoints
apiCacheManager.configure('workspaces', {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    deduplicate: true,
});

apiCacheManager.configure('datasources', {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    deduplicate: true,
});

apiCacheManager.configure('sessions', {
    ttl: 2 * 60 * 1000, // 2 minutes (sessions change more frequently)
    staleWhileRevalidate: true,
    deduplicate: true,
});

apiCacheManager.configure('messages', {
    ttl: 1 * 60 * 1000, // 1 minute (messages change frequently)
    staleWhileRevalidate: true,
    deduplicate: true,
});

apiCacheManager.configure('workspace-context', {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    deduplicate: true,
});

apiCacheManager.configure('usage', {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    deduplicate: true,
});
