import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

// Default configurations for different endpoints
export const rateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Appointment booking - moderate limits
  booking: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 bookings per minute
    message: 'Too many booking attempts. Please wait before trying again.',
  },
  
  // Search endpoints - generous limits
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    message: 'Too many search requests. Please slow down.',
  },
  
  // General API endpoints
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please try again later.',
  },
  
  // Admin endpoints - moderate limits
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    message: 'Too many admin requests. Please slow down.',
  }
};

// In-memory store for rate limiting (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Get client identifier (IP address + user agent for better uniqueness)
    const clientId = getClientId(request);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = requestCounts.get(clientId);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      requestCounts.set(clientId, entry);
    }
    
    // Increment request count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: config.message || 'Too many requests',
          retryAfter: resetTimeSeconds,
          limit: config.maxRequests,
          windowMs: config.windowMs
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString(),
            'Retry-After': resetTimeSeconds.toString()
          }
        }
      );
    }
    
    // Request is within limits, return null to continue
    return null;
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a hash of IP + User Agent for better uniqueness
  return `${ip}-${hashString(userAgent)}`;
}

/**
 * Simple hash function for strings
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(config: RateLimitConfig) {
  return function <T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      const request = args[0] as NextRequest;
      
      // Apply rate limiting
      const rateLimitResponse = await rateLimit(config)(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
      
      // Continue with original handler
      return handler(...args);
    };
  };
}

/**
 * Get rate limit configuration based on endpoint path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname.includes('/auth') || pathname.includes('/sign-in') || pathname.includes('/sign-up')) {
    return rateLimitConfigs.auth;
  }
  
  if (pathname.includes('/appointments/book')) {
    return rateLimitConfigs.booking;
  }
  
  if (pathname.includes('/search') || pathname.includes('/doctors/search')) {
    return rateLimitConfigs.search;
  }
  
  if (pathname.includes('/admin/')) {
    return rateLimitConfigs.admin;
  }
  
  return rateLimitConfigs.general;
}

/**
 * Middleware function for automatic rate limiting
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  
  // Skip rate limiting for static assets
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/favicon') || 
      pathname.startsWith('/manifest') ||
      pathname.includes('.')) {
    return null;
  }
  
  // Apply rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const config = getRateLimitConfig(pathname);
    return rateLimit(config)(request);
  }
  
  return null;
}

/**
 * Get current rate limit status for a client
 */
export function getRateLimitStatus(request: NextRequest, config: RateLimitConfig) {
  const clientId = getClientId(request);
  const entry = requestCounts.get(clientId);
  const now = Date.now();
  
  if (!entry || now > entry.resetTime) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: now + config.windowMs,
      retryAfter: 0
    };
  }
  
  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: entry.resetTime,
    retryAfter: entry.count > config.maxRequests ? Math.ceil((entry.resetTime - now) / 1000) : 0
  };
}
