/**
 * Security Configuration and Environment Validation
 * Ensures proper security configuration for production deployment
 */

import crypto from 'crypto';

// Security configuration constants
export const SECURITY_CONSTANTS = {
  // Encryption settings
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    SALT_LENGTH: 32,
  },
  
  // Session security
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    IDLE_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours
    SECURE_COOKIES: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict' as const,
  },
  
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  },
  
  // API security
  API: {
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100,
    REQUEST_TIMEOUT: 30 * 1000, // 30 seconds
    MAX_PAYLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  },
  
  // File upload security
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    SCAN_FOR_MALWARE: true,
    QUARANTINE_SUSPICIOUS: true,
  },
};

/**
 * Environment validation for security
 */
export class SecurityValidator {
  private static requiredEnvVars = [
    'MONGODB_URI',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];
  
  private static productionEnvVars = [
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'RESEND_API_KEY',
  ];
  
  /**
   * Validate environment configuration
   */
  static validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required environment variables
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      for (const envVar of this.productionEnvVars) {
        if (!process.env[envVar]) {
          warnings.push(`Missing production environment variable: ${envVar}`);
        }
      }
      
      // Check for development keys in production
      if (process.env.CLERK_SECRET_KEY?.includes('test')) {
        errors.push('Using test Clerk keys in production');
      }
      
      if (process.env.STRIPE_SECRET_KEY?.includes('test')) {
        errors.push('Using test Stripe keys in production');
      }
      
      // Check HTTPS enforcement
      if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
        errors.push('HTTPS must be enforced in production');
      }
    }
    
    // Validate encryption key
    if (process.env.ENCRYPTION_KEY) {
      if (process.env.ENCRYPTION_KEY.length < 64) {
        errors.push('Encryption key must be at least 64 characters long');
      }
    }
    
    // Check database connection security
    if (process.env.MONGODB_URI) {
      if (!process.env.MONGODB_URI.includes('ssl=true') && process.env.NODE_ENV === 'production') {
        warnings.push('MongoDB connection should use SSL in production');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateSecurityScore(errors, warnings),
    };
  }
  
  /**
   * Calculate security configuration score
   */
  private static calculateSecurityScore(errors: string[], warnings: string[]): number {
    let score = 100;
    score -= errors.length * 20; // Major deductions for errors
    score -= warnings.length * 5; // Minor deductions for warnings
    return Math.max(0, score);
  }
  
  /**
   * Generate secure encryption key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH).toString('hex');
  }
  
  /**
   * Validate API key format
   */
  static validateAPIKey(key: string, service: string): boolean {
    const patterns = {
      clerk: /^(pk|sk)_(test|live)_[a-zA-Z0-9]{32,}$/,
      stripe: /^(pk|sk)_(test|live)_[a-zA-Z0-9]{24,}$/,
      vonage: /^[a-f0-9]{8}$/,
      resend: /^re_[a-zA-Z0-9]{32}$/,
    };
    
    const pattern = patterns[service as keyof typeof patterns];
    return pattern ? pattern.test(key) : false;
  }
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=(self)',
    'microphone=(self)',
    'geolocation=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
  ].join(', '),
  
  // HSTS (only in production with HTTPS)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.opentok.com https://js.stripe.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' blob:",
    "connect-src 'self' https://api.stripe.com https://api.vonage.com https://api.resend.com wss: ws:",
    "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
};

/**
 * Security middleware configuration
 */
export const SECURITY_MIDDLEWARE_CONFIG = {
  // Rate limiting
  rateLimiting: {
    windowMs: SECURITY_CONSTANTS.API.RATE_LIMIT_WINDOW,
    max: SECURITY_CONSTANTS.API.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Request size limiting
  requestSizeLimit: {
    json: { limit: '10mb' },
    urlencoded: { limit: '10mb', extended: true },
    raw: { limit: '10mb' },
    text: { limit: '10mb' },
  },
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.NEXT_PUBLIC_APP_URL!]
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token',
    ],
  },
  
  // Session security
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: SECURITY_CONSTANTS.SESSION.SECURE_COOKIES,
      httpOnly: true,
      maxAge: SECURITY_CONSTANTS.SESSION.MAX_AGE,
      sameSite: SECURITY_CONSTANTS.SESSION.SAME_SITE,
    },
  },
};

/**
 * Security audit configuration
 */
export const SECURITY_AUDIT_CONFIG = {
  // Events to always log
  criticalEvents: [
    'LOGIN_ATTEMPT',
    'LOGIN_FAILURE',
    'PASSWORD_CHANGE',
    'ROLE_CHANGE',
    'ADMIN_ACTION',
    'PAYMENT_TRANSACTION',
    'DATA_EXPORT',
    'SECURITY_INCIDENT',
  ],
  
  // Retention periods
  retention: {
    security_logs: 90 * 24 * 60 * 60 * 1000, // 90 days
    audit_logs: 365 * 24 * 60 * 60 * 1000, // 1 year
    error_logs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  
  // Alert thresholds
  alertThresholds: {
    failed_logins: 10, // per hour
    security_incidents: 5, // per hour
    error_rate: 0.05, // 5%
    response_time: 5000, // 5 seconds
  },
};

// Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

/**
 * Initialize security configuration
 */
export function initializeSecurity(): ValidationResult {
  console.log('🔒 Initializing security configuration...');
  
  const validation = SecurityValidator.validateEnvironment();
  
  if (validation.errors.length > 0) {
    console.error('❌ Security validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Security warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log(`🔒 Security score: ${validation.score}/100`);
  
  if (validation.score >= 80) {
    console.log('✅ Security configuration is good');
  } else if (validation.score >= 60) {
    console.log('⚠️ Security configuration needs improvement');
  } else {
    console.log('❌ Security configuration is inadequate');
  }
  
  return validation;
}

// Export security configuration
export default {
  CONSTANTS: SECURITY_CONSTANTS,
  HEADERS: SECURITY_HEADERS,
  MIDDLEWARE: SECURITY_MIDDLEWARE_CONFIG,
  AUDIT: SECURITY_AUDIT_CONFIG,
  validator: SecurityValidator,
  initialize: initializeSecurity,
};
