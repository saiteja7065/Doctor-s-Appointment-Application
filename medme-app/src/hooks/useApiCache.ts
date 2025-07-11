'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface UseApiCacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  retryOnError?: boolean;
  maxRetries?: number;
}

// Client-side cache storage
const clientCache = new Map<string, CacheItem<any>>();

// Clean up expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, item] of clientCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        clientCache.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true,
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const retryCount = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache) {
      const cached = clientCache.get(key);
      if (cached) {
        const isExpired = Date.now() - cached.timestamp > cached.ttl;
        
        if (!isExpired) {
          setData(cached.data);
          setError(null);
          return cached.data;
        } else if (staleWhileRevalidate) {
          // Return stale data immediately, then fetch fresh data
          setData(cached.data);
          setError(null);
        }
      }
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      
      // Cache the result
      clientCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl
      });

      setData(result);
      retryCount.current = 0;
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (retryOnError && retryCount.current < maxRetries) {
        retryCount.current++;
        // Exponential backoff
        const delay = Math.pow(2, retryCount.current) * 1000;
        setTimeout(() => fetchData(false), delay);
        return;
      }

      setError(error);
      
      // If we have stale data, keep showing it
      if (!staleWhileRevalidate) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, staleWhileRevalidate, retryOnError, maxRetries]);

  const invalidate = useCallback(() => {
    clientCache.delete(key);
    fetchData(false);
  }, [key, fetchData]);

  const mutate = useCallback((newData: T) => {
    clientCache.set(key, {
      data: newData,
      timestamp: Date.now(),
      ttl
    });
    setData(newData);
  }, [key, ttl]);

  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(false),
    invalidate,
    mutate
  };
}

// Hook for prefetching data
export function usePrefetch() {
  const prefetch = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ) => {
    // Only prefetch if not already cached
    const cached = clientCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return;
    }

    try {
      const data = await fetcher();
      clientCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
    } catch (error) {
      // Silently fail for prefetch
      console.warn('Prefetch failed for key:', key, error);
    }
  }, []);

  return { prefetch };
}

// Cache utilities
export const cacheUtils = {
  clear: () => clientCache.clear(),
  delete: (key: string) => clientCache.delete(key),
  has: (key: string) => clientCache.has(key),
  size: () => clientCache.size,
  keys: () => Array.from(clientCache.keys()),
  
  // Invalidate by pattern
  invalidatePattern: (pattern: string) => {
    const keys = Array.from(clientCache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        clientCache.delete(key);
      }
    });
  }
};
