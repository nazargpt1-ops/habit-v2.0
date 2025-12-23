
export interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const CACHE_PREFIX = 'habitflow_cache_';

export const setInCache = <T>(key: string, data: T, ttlMs: number): void => {
  const entry: CacheEntry<T> = {
    data,
    expiry: Date.now() + ttlMs,
  };
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    console.error('Failed to set cache:', e);
  }
};

export const getFromCache = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const entry: CacheEntry<T> = JSON.parse(item);
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch (e) {
    return null;
  }
};

export const clearCache = (key?: string): void => {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  } else {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
};
