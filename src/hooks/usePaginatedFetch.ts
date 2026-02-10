import { useState, useEffect, useRef, useCallback } from 'react';
import type { PaginatedResponse } from '../types/api';
import { DEFAULT_PAGE_SIZE, INITIAL_PAGE } from '../constants/pagination';

export interface UsePaginatedFetchOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
  enabled?: boolean;
  resetDeps?: any[];
}

export interface UsePaginatedFetchResult<T> {
  items: T[];
  isLoading: boolean;
  isFetchingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  observerRef: (node: HTMLElement | null) => void;
}

export function usePaginatedFetch<T>({
  fetchFn,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
  resetDeps = []
}: UsePaginatedFetchOptions<T>): UsePaginatedFetchResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(INITIAL_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Track abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Track if we're currently fetching
  const isFetchingRef = useRef(false);

  // IntersectionObserver reference
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset state when dependencies change
  const reset = useCallback(() => {
    setItems([]);
    setPage(INITIAL_PAGE);
    setError(null);
    setHasMore(true);
    setIsLoading(false);
    setIsFetchingMore(false);

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isFetchingRef.current = false;
  }, []);

  // Fetch data function
  const fetchData = useCallback(async (currentPage: number, isFirstLoad: boolean) => {
    if (!enabled || isFetchingRef.current) {
      return;
    }

    // Prevent duplicate requests
    isFetchingRef.current = true;

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      if (isFirstLoad) {
        setIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      setError(null);

      const response = await fetchFn(currentPage, pageSize);

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current) return;

      if (currentPage === INITIAL_PAGE) {
        // First page - replace items
        setItems(response.items);
      } else {
        // Subsequent pages - append items
        setItems(prev => [...prev, ...response.items]);
      }

      setHasMore(response.has_next);
      setPage(currentPage);
    } catch (err) {
      if (!isMountedRef.current) return;

      // Don't set error for aborted requests
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[usePaginatedFetch] Error fetching data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
      isFetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [enabled, fetchFn, pageSize]);

  // Load more handler
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current || !enabled) return;
    fetchData(page + 1, false);
  }, [hasMore, page, enabled, fetchData]);

  // Intersection observer callback
  const observerCallback = useCallback((node: HTMLElement | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Don't observe if we're loading, have no more items, or not enabled
    if (!node || !hasMore || isFetchingRef.current || !enabled) return;

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // When the sentinel element is visible and we have more items
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          loadMore();
        }
      },
      {
        // Trigger when element is 200px before entering viewport
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    observerRef.current.observe(node);
  }, [hasMore, enabled, loadMore]);

  // Reset when dependencies change
  useEffect(() => {
    if (resetDeps.length > 0) {
      reset();
    }
  }, resetDeps); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch after mount or reset
  useEffect(() => {
    if (enabled && items.length === 0 && !isLoading && !error) {
      fetchData(INITIAL_PAGE, true);
    }
  }, [enabled, items.length, isLoading, error, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Abort in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Disconnect observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    items,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    reset,
    observerRef: observerCallback
  };
}
