/**
 * Edge Runtime Compatible Security Middleware
 * Simplified security middleware that works in Edge Runtime without Node.js dependencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEventEdge, AuditAction, AuditSeverity } from '@/lib/audit-edge';

// Simple in-memory rate limiting for Edge Runtime
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting function for Edge Runtime
 */
function simpleRateLimit(ip: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = ip;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // New window or expired window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Basic security headers for Edge Runtime
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
}

/**
 * Basic threat detection for Edge Runtime
 */
function detectThreats(request: NextRequest): { threats: string[]; riskScore: number } {
  const threats: string[] = [];
  let riskScore = 0;

  const url = request.url;
  const userAgent = request.headers.get('user-agent') || '';

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(\'|\"|;|--|\*|\/\*|\*\/)/,
    /(\bor\b|\band\b).*(\=|\<|\>)/i
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      threats.push('SQL_INJECTION_ATTEMPT');
      riskScore += 30;
      break;
    }
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      threats.push('XSS_ATTEMPT');
      riskScore += 25;
      break;
    }
  }

  // Check for suspicious paths
  const suspiciousPaths = [
    /\/admin/,
    /\/wp-admin/,
    /\/phpmyadmin/,
    /\/\.env/,
    /\/config/,
    /\/backup/
  ];

  for (const pattern of suspiciousPaths) {
    if (pattern.test(new URL(url).pathname)) {
      threats.push('SUSPICIOUS_PATH_ACCESS');
      riskScore += 20;
      break;
    }
  }

  // Check for suspicious user agents
  const suspiciousUAPatterns = [
    /bot/i,
    /crawler/i,
    /scanner/i,
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /curl/i,
    /wget/i,
    /python/i,
    /^$/
  ];

  for (const pattern of suspiciousUAPatterns) {
    if (pattern.test(userAgent)) {
      threats.push('SUSPICIOUS_USER_AGENT');
      riskScore += 15;
      break;
    }
  }

  return { threats, riskScore: Math.min(riskScore, 100) };
}

/**
 * Get client IP address with proper header handling
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP from the comma-separated list
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  return request.ip || 'unknown';
}

/**
 * Main security middleware that orchestrates all security checks
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const ip = getClientIP(request);

    // 1. Rate limiting
    const rateLimitResult = simpleRateLimit(ip, 100, 15 * 60 * 1000); // 100 requests per 15 minutes

    if (!rateLimitResult.allowed) {
      // Log rate limit exceeded (fire-and-forget)
      logSecurityEventEdge(
        AuditAction.RATE_LIMIT_EXCEEDED,
        AuditSeverity.MEDIUM,
        'Rate limit exceeded',
        undefined,
        request,
        undefined,
        {
          ip,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      ).catch(() => {
        // Silently fail
      });

      const response = new NextResponse('Too Many Requests', { status: 429 });
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());

      return applySecurityHeaders(response);
    }

    // 2. Threat detection
    const threatAnalysis = detectThreats(request);
    if (threatAnalysis.riskScore >= 60) {
      // Log security incident (fire-and-forget)
      logSecurityEventEdge(
        AuditAction.SECURITY_INCIDENT,
        AuditSeverity.HIGH,
        'Security threat detected',
        undefined,
        request,
        undefined,
        {
          threats: threatAnalysis.threats,
          riskScore: threatAnalysis.riskScore,
        }
      ).catch(() => {
        // Silently fail
      });

      const response = new NextResponse('Security Violation Detected', { status: 403 });
      return applySecurityHeaders(response);
    }

    // 3. Continue to next middleware/handler
    const response = NextResponse.next();

    // Apply security headers
    applySecurityHeaders(response);

    // Add security metrics headers
    response.headers.set('X-Security-Check-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Rate-Limit-Remaining', rateLimitResult.remaining.toString());

    return response;

  } catch (error) {
    console.error('Security middleware error:', error);

    // Log security middleware failure (fire-and-forget)
    logSecurityEventEdge(
      AuditAction.SYSTEM_ERROR,
      AuditSeverity.HIGH,
      'Security middleware failure',
      undefined,
      request,
      error instanceof Error ? error.message : 'Unknown error',
      { stack: error instanceof Error ? error.stack : undefined }
    ).catch(() => {
      // Silently fail
    });

    // Fail securely - deny access on security middleware failure
    const response = new NextResponse('Security Check Failed', { status: 500 });
    return applySecurityHeaders(response);
  }
}



/**
 * Check if endpoint is sensitive and requires additional validation
 */
function isSensitiveEndpoint(pathname: string): boolean {
  const sensitivePatterns = [
    /^\/api\/admin/,
    /^\/api\/payments/,
    /^\/api\/users\/role/,
    /^\/api\/doctors\/apply/,
    /^\/api\/patients\/subscription/,
    /^\/admin/,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(pathname));
}

/**
 * Check if endpoint is high-value and should be logged
 */
function isHighValueEndpoint(pathname: string): boolean {
  const highValuePatterns = [
    /^\/api\/admin/,
    /^\/api\/payments/,
    /^\/api\/appointments\/book/,
    /^\/api\/doctors\/earnings/,
    /^\/api\/consultations/,
  ];
  
  return highValuePatterns.some(pattern => pattern.test(pathname));
}

/**
 * Validate sensitive requests
 */
async function validateSensitiveRequest(request: NextRequest): Promise<{
  valid: boolean;
  reason?: string;
}> {
  // Check Content-Type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        valid: false,
        reason: 'Invalid or missing Content-Type header'
      };
    }
  }
  
  // Check for required headers
  const requiredHeaders = ['user-agent'];
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      return {
        valid: false,
        reason: `Missing required header: ${header}`
      };
    }
  }
  
  // Validate User-Agent (basic check for automated requests)
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.length < 10 || /^(curl|wget|python|bot)/i.test(userAgent)) {
    return {
      valid: false,
      reason: 'Suspicious User-Agent'
    };
  }
  
  // Check for suspicious query parameters
  const url = new URL(request.url);
  const suspiciousParams = ['script', 'eval', 'exec', 'system', 'cmd'];
  for (const [key, value] of url.searchParams) {
    if (suspiciousParams.some(param => key.toLowerCase().includes(param) || value.toLowerCase().includes(param))) {
      return {
        valid: false,
        reason: 'Suspicious query parameters detected'
      };
    }
  }
  
  return { valid: true };
}

/**
 * Security configuration for different environments
 */
export const SECURITY_MIDDLEWARE_CONFIG = {
  // Skip security checks for certain paths
  skipPaths: [
    '/api/health',
    '/api/status',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/sw.js',
  ],
  
  // Enhanced security for admin paths
  adminPaths: [
    '/admin',
    '/api/admin',
  ],
  
  // Rate limiting configuration
  rateLimits: {
    default: { max: 100, window: 15 * 60 * 1000 }, // 100 requests per 15 minutes
    auth: { max: 10, window: 15 * 60 * 1000 }, // 10 auth attempts per 15 minutes
    payment: { max: 5, window: 60 * 60 * 1000 }, // 5 payment attempts per hour
    admin: { max: 50, window: 15 * 60 * 1000 }, // 50 admin requests per 15 minutes
  },
  
  // Security headers configuration
  headers: {
    enableHSTS: process.env.NODE_ENV === 'production',
    enableCSP: true,
    enableXSSProtection: true,
    enableFrameOptions: true,
    enableContentTypeOptions: true,
  },
};

/**
 * Check if path should skip security checks
 */
export function shouldSkipSecurityCheck(pathname: string): boolean {
  return SECURITY_MIDDLEWARE_CONFIG.skipPaths.some(path => 
    pathname.startsWith(path)
  );
}

/**
 * Get rate limit configuration for path
 */
export function getRateLimitConfig(pathname: string): { max: number; window: number } {
  if (pathname.startsWith('/api/admin')) {
    return SECURITY_MIDDLEWARE_CONFIG.rateLimits.admin;
  }
  
  if (pathname.includes('/auth') || pathname.includes('/sign-in') || pathname.includes('/sign-up')) {
    return SECURITY_MIDDLEWARE_CONFIG.rateLimits.auth;
  }
  
  if (pathname.includes('/payment') || pathname.includes('/billing')) {
    return SECURITY_MIDDLEWARE_CONFIG.rateLimits.payment;
  }
  
  return SECURITY_MIDDLEWARE_CONFIG.rateLimits.default;
}

// Export the main security middleware
export default securityMiddleware;
