
import { useState, useEffect, useCallback } from 'react';
import { getFromCache, setInCache } from '../lib/cache';

export function useCachedAPI<T>(
  apiFunction: () => Promise<T>,
  cacheKey: string,
  ttlMs: number = 300000 // 5 minutes default
) {
  const [data, setData] = useState<T | null>(() => getFromCache<T>(cacheKey));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      if (!forceRefresh) {
        const cached = getFromCache<T>(cacheKey);
        if (cached) {
          setData(cached);
        }
      }

      const freshData = await apiFunction();
      if (freshData !== null && freshData !== undefined) {
        setData(freshData);
        setInCache(cacheKey, freshData, ttlMs);
      }
      setError(null);
    } catch (err) {
      console.error(`Cache hook error for ${cacheKey}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // If we have cached data, we keep it despite the error
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction, cacheKey, ttlMs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = () => fetchData(true);

  return { data, isLoading, error, refresh };
}
