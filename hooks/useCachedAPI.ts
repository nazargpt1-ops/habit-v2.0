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
      // Сначала показываем кешированные данные если есть
      if (!forceRefresh) {
        const cached = getFromCache<T>(cacheKey);
        if (cached) {
          setData(cached);
          setIsLoading(false); // Уже показали данные
        }
      }

      // Запрашиваем свежие данные
      const freshData = await apiFunction();
      
      // null = 304 Not Modified, данные не изменились
      if (freshData === null) {
        console.log(`[Cache] Using cached data for ${cacheKey} (304 response)`);
        setError(null);
        setIsLoading(false);
        return;
      }
      
      // Обновляем данные если пришли новые
      if (freshData !== undefined) {
        setData(freshData);
        setInCache(cacheKey, freshData, ttlMs);
      }
      
      setError(null);
    } catch (err) {
      console.error(`Cache hook error for ${cacheKey}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Если у нас есть кешированные данные, оставляем их несмотря на ошибку
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
