// Simple in-memory cache for API responses
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize = 100; // Maximum number of cached items

  set(key: string, data: any, ttlSeconds: number = 300): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000, // Convert to milliseconds
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instance
const apiCache = new MemoryCache();

// Clean up expired entries every 5 minutes
if (typeof window === 'undefined') { // Only run on server
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}

// Cache key generators
export const cacheKeys = {
  doctorStats: (doctorId: string) => `doctor:stats:${doctorId}`,
  doctorAppointments: (doctorId: string, filters: string) => `doctor:appointments:${doctorId}:${filters}`,
  patientProfile: (patientId: string) => `patient:profile:${patientId}`,
  doctorsList: (filters: string) => `doctors:list:${filters}`,
  appointmentDetails: (appointmentId: string) => `appointment:${appointmentId}`,
};

// Cache TTL constants (in seconds)
export const cacheTTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 900, // 15 minutes
  veryLong: 3600, // 1 hour
};

// Wrapper function for caching API responses
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = cacheTTL.medium
): Promise<T> {
  // Try to get from cache first
  const cached = apiCache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  apiCache.set(key, data, ttlSeconds);
  
  return data;
}

// Invalidate cache entries by pattern
export function invalidateCache(pattern: string): void {
  const keys = Array.from(apiCache['cache'].keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  });
}

// Export cache instance for direct access if needed
export { apiCache };

// Cache middleware for API routes
export function cacheMiddleware(ttlSeconds: number = cacheTTL.medium) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const request = args[0];
      const cacheKey = `${propertyName}:${request.url}`;
      
      return withCache(cacheKey, () => method.apply(this, args), ttlSeconds);
    };

    return descriptor;
  };
}
