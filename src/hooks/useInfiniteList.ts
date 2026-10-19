import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchResult<T> {
  items: T[];
  nextCursor?: string;
}

interface UseInfiniteListOptions<T> {
  fetcher: (cursor?: string) => Promise<FetchResult<T>>;
  initialCursor?: string;
  autoLoad?: boolean;
}

export function useInfiniteList<T>({
  fetcher,
  initialCursor,
  autoLoad = true,
}: UseInfiniteListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(initialCursor);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setHasMore(Boolean(res.nextCursor));
    } catch (err: any) {
      setError(err?.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetcher(nextCursor);
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      setHasMore(Boolean(res.nextCursor));
    } catch (err: any) {
      setError(err?.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [fetcher, hasMore, loadingMore, nextCursor]);

  const refresh = useCallback(() => {
    setNextCursor(undefined);
    setHasMore(true);
    return loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (autoLoad) {
      loadInitial();
    }
  }, [autoLoad, loadInitial]);

  useEffect(() => {
    if (!triggerRef.current || !hasMore || loading || loadingMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '250px' }
    );

    observerRef.current.observe(triggerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loadMore, loading, loadingMore]);

  return {
    items,
    setItems,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    triggerRef,
  };
}
