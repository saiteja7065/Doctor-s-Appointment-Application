import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanitizeForLogging } from './encryption';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.opentok.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://api.vonage.com wss:; frame-src https://js.stripe.com;",
};

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  // Increment count
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime };
}

/**
 * Input validation and sanitization
 */
export function validateAndSanitizeInput(input: any, rules: ValidationRules): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = input[field];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation if field is not required and empty
    if (!rule.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Type validation
    if (rule.type && typeof value !== rule.type) {
      errors.push(`${field} must be of type ${rule.type}`);
      continue;
    }
    
    // String validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters long`);
        continue;
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
        continue;
      }
      
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
        continue;
      }
      
      // Sanitize string
      sanitized[field] = value.trim();
      
      // Additional sanitization for HTML
      if (rule.sanitizeHtml) {
        sanitized[field] = sanitized[field]
          .replace(/[<>]/g, '') // Remove < and >
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, ''); // Remove event handlers
      }
    } else {
      sanitized[field] = value;
    }
    
    // Number validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
        continue;
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must be no more than ${rule.max}`);
        continue;
      }
      
      sanitized[field] = value;
    }
    
    // Array validations
    if (rule.type === 'object' && Array.isArray(value)) {
      if (rule.minItems && value.length < rule.minItems) {
        errors.push(`${field} must have at least ${rule.minItems} items`);
        continue;
      }
      
      if (rule.maxItems && value.length > rule.maxItems) {
        errors.push(`${field} must have no more than ${rule.maxItems} items`);
        continue;
      }
      
      sanitized[field] = value;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized
  };
}

// Validation rule types
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  sanitizeHtml?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: any;
}

/**
 * Common validation patterns
 */
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s\-'\.]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  mongoId: /^[0-9a-fA-F]{24}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

/**
 * Security middleware for API routes
 */
export async function securityMiddleware(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    rateLimit?: { maxRequests: number; windowMs: number };
    validateInput?: { rules: ValidationRules; body?: boolean };
    allowedMethods?: string[];
  } = {}
): Promise<{ success: boolean; response?: NextResponse; data?: any }> {
  try {
    // Check allowed methods
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      return {
        success: false,
        response: new NextResponse('Method not allowed', { status: 405 })
      };
    }
    
    // Apply rate limiting
    if (options.rateLimit) {
      const identifier = request.ip || 'unknown';
      const rateLimitResult = rateLimit(
        identifier,
        options.rateLimit.maxRequests,
        options.rateLimit.windowMs
      );
      
      if (!rateLimitResult.allowed) {
        const response = new NextResponse('Too many requests', { status: 429 });
        response.headers.set('X-RateLimit-Limit', options.rateLimit.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
        return { success: false, response };
      }
    }
    
    // Check authentication
    if (options.requireAuth) {
      const { userId } = await auth();
      if (!userId) {
        return {
          success: false,
          response: new NextResponse('Unauthorized', { status: 401 })
        };
      }
    }
    
    // Validate input
    let validatedData: any = {};
    if (options.validateInput) {
      let inputData: any = {};
      
      if (options.validateInput.body && request.method !== 'GET') {
        try {
          inputData = await request.json();
        } catch (error) {
          return {
            success: false,
            response: new NextResponse('Invalid JSON', { status: 400 })
          };
        }
      }
      
      // Add query parameters
      const searchParams = new URL(request.url).searchParams;
      for (const [key, value] of searchParams.entries()) {
        inputData[key] = value;
      }
      
      const validation = validateAndSanitizeInput(inputData, options.validateInput.rules);
      
      if (!validation.isValid) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Validation failed', details: validation.errors },
            { status: 400 }
          )
        };
      }
      
      validatedData = validation.sanitizedData;
    }
    
    return { success: true, data: validatedData };
    
  } catch (error) {
    console.error('Security middleware error:', sanitizeForLogging(error));
    return {
      success: false,
      response: new NextResponse('Internal server error', { status: 500 })
    };
  }
}

/**
 * Clean up rate limit store (should be called periodically)
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  const crypto = require('crypto');
  const expectedToken = crypto
    .createHmac('sha256', sessionToken)
    .update('csrf-token')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(expectedToken, 'hex')
  );
}
