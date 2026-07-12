"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCachedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttlMs?: number;
  enabled?: boolean;
}

interface CacheStoreEntry<T> {
  value: T;
  expiresAt: number;
}

const clientCache = new Map<string, CacheStoreEntry<unknown>>();

/**
 * Client-side cached data hook with TTL.
 * Mirrors server-side lib/cache for consistent caching architecture.
 */
export function useCachedData<T>({
  key,
  fetcher,
  ttlMs = 60_000,
  enabled = true,
}: UseCachedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const existing = clientCache.get(key);
      if (existing && existing.expiresAt > Date.now()) {
        setData(existing.value as T);
        setLoading(false);
        return;
      }

      const value = await fetcherRef.current();
      clientCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      setData(value);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch data"));
    } finally {
      setLoading(false);
    }
  }, [key, ttlMs]);

  useEffect(() => {
    if (enabled) {
      void load();
    }
  }, [enabled, load]);

  return { data, loading, error, refetch: load };
}
