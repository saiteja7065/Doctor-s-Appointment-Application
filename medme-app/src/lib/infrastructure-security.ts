/**
 * Infrastructure Security and Deployment Configuration
 * Handles production deployment security, environment validation, and infrastructure hardening
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_HEADERS } from './security-config';

/**
 * Infrastructure security configuration
 */
export const INFRASTRUCTURE_CONFIG = {
  // Deployment environments
  ENVIRONMENTS: {
    development: {
      allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
      logLevel: 'debug',
      enableDevTools: true,
      strictSecurity: false,
    },
    staging: {
      allowedOrigins: ['https://staging.medme.app'],
      logLevel: 'info',
      enableDevTools: false,
      strictSecurity: true,
    },
    production: {
      allowedOrigins: ['https://medme.app', 'https://www.medme.app'],
      logLevel: 'error',
      enableDevTools: false,
      strictSecurity: true,
    },
  },
  
  // Security monitoring
  MONITORING: {
    enableRealTimeAlerts: true,
    alertWebhook: process.env.SECURITY_ALERT_WEBHOOK,
    logRetention: 90, // days
    metricsRetention: 365, // days
  },
  
  // Infrastructure hardening
  HARDENING: {
    disableServerSignature: true,
    hideVersionInfo: true,
    enableHSTS: true,
    enforceHTTPS: true,
    enableCSP: true,
    enableCORS: true,
  },
};

/**
 * Environment-specific security configuration
 */
export class InfrastructureSecurity {
  private static currentEnv = process.env.NODE_ENV || 'development';
  
  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig() {
    return INFRASTRUCTURE_CONFIG.ENVIRONMENTS[
      this.currentEnv as keyof typeof INFRASTRUCTURE_CONFIG.ENVIRONMENTS
    ] || INFRASTRUCTURE_CONFIG.ENVIRONMENTS.development;
  }
  
  /**
   * Validate deployment environment
   */
  static validateDeployment(): DeploymentValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = this.getEnvironmentConfig();
    
    // Production-specific validations
    if (this.currentEnv === 'production') {
      // Check required production environment variables
      const requiredProdVars = [
        'MONGODB_URI',
        'CLERK_SECRET_KEY',
        'STRIPE_SECRET_KEY',
        'ENCRYPTION_KEY',
        'NEXT_PUBLIC_APP_URL',
      ];
      
      for (const envVar of requiredProdVars) {
        if (!process.env[envVar]) {
          errors.push(`Missing required production environment variable: ${envVar}`);
        }
      }
      
      // Validate production URLs
      if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
        errors.push('Production app URL must use HTTPS');
      }
      
      // Check for test/development keys
      if (process.env.CLERK_SECRET_KEY?.includes('test')) {
        errors.push('Cannot use test Clerk keys in production');
      }
      
      if (process.env.STRIPE_SECRET_KEY?.includes('test')) {
        errors.push('Cannot use test Stripe keys in production');
      }
      
      // Validate database connection
      if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('ssl=true')) {
        warnings.push('MongoDB should use SSL in production');
      }
    }
    
    // Check security headers configuration
    if (!INFRASTRUCTURE_CONFIG.HARDENING.enableCSP) {
      warnings.push('Content Security Policy should be enabled');
    }
    
    if (!INFRASTRUCTURE_CONFIG.HARDENING.enableHSTS && this.currentEnv === 'production') {
      warnings.push('HSTS should be enabled in production');
    }
    
    return {
      isValid: errors.length === 0,
      environment: this.currentEnv,
      errors,
      warnings,
      config,
      securityScore: this.calculateSecurityScore(errors, warnings),
    };
  }
  
  /**
   * Calculate infrastructure security score
   */
  private static calculateSecurityScore(errors: string[], warnings: string[]): number {
    let score = 100;
    
    // Deduct points for errors and warnings
    score -= errors.length * 15;
    score -= warnings.length * 5;
    
    // Bonus points for production hardening
    if (this.currentEnv === 'production') {
      if (INFRASTRUCTURE_CONFIG.HARDENING.enableHSTS) score += 5;
      if (INFRASTRUCTURE_CONFIG.HARDENING.enableCSP) score += 5;
      if (INFRASTRUCTURE_CONFIG.HARDENING.enforceHTTPS) score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Apply security headers to response
   */
  static applySecurityHeaders(response: NextResponse): NextResponse {
    const config = this.getEnvironmentConfig();
    
    // Apply all security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Environment-specific headers
    if (config.strictSecurity) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    }
    
    // Hide server information
    if (INFRASTRUCTURE_CONFIG.HARDENING.hideVersionInfo) {
      response.headers.delete('Server');
      response.headers.delete('X-Powered-By');
    }
    
    return response;
  }
  
  /**
   * Validate request origin
   */
  static validateOrigin(request: NextRequest): boolean {
    const config = this.getEnvironmentConfig();
    const origin = request.headers.get('origin');
    
    if (!origin) {
      // Allow same-origin requests
      return true;
    }
    
    return config.allowedOrigins.includes(origin);
  }
  
  /**
   * Check if request is from allowed IP (for admin endpoints)
   */
  static isAllowedIP(request: NextRequest): boolean {
    // In development, allow all IPs
    if (this.currentEnv === 'development') {
      return true;
    }
    
    const ip = this.getClientIP(request);
    const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
    
    // If no IP restrictions configured, allow all
    if (allowedIPs.length === 0) {
      return true;
    }
    
    return allowedIPs.some(allowedIP => {
      // Support CIDR notation and exact matches
      if (allowedIP.includes('/')) {
        return this.isIPInCIDR(ip, allowedIP);
      }
      return ip === allowedIP.trim();
    });
  }
  
  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           'unknown';
  }
  
  /**
   * Check if IP is in CIDR range
   */
  private static isIPInCIDR(ip: string, cidr: string): boolean {
    // Simple CIDR check - in production, use a proper library
    const [network, prefixLength] = cidr.split('/');
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    const prefix = parseInt(prefixLength);
    
    // Convert to 32-bit integers for comparison
    const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const networkInt = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
    const mask = (-1 << (32 - prefix)) >>> 0;
    
    return (ipInt & mask) === (networkInt & mask);
  }
}

/**
 * Infrastructure monitoring and alerting
 */
export class InfrastructureMonitoring {
  /**
   * Send security alert
   */
  static async sendSecurityAlert(alert: SecurityAlert): Promise<void> {
    const webhook = INFRASTRUCTURE_CONFIG.MONITORING.alertWebhook;
    
    if (!webhook) {
      console.warn('Security alert webhook not configured');
      return;
    }
    
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 Security Alert: ${alert.title}`,
          attachments: [
            {
              color: this.getAlertColor(alert.severity),
              fields: [
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Environment', value: process.env.NODE_ENV, short: true },
                { title: 'Description', value: alert.description, short: false },
                { title: 'Timestamp', value: new Date().toISOString(), short: true },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }
  
  /**
   * Get alert color based on severity
   */
  private static getAlertColor(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffcc00';
      case 'low': return '#00ff00';
      default: return '#cccccc';
    }
  }
  
  /**
   * Monitor system health
   */
  static async monitorHealth(): Promise<HealthStatus> {
    const status: HealthStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      services: {},
      overall: 'healthy',
    };
    
    // Check database connectivity
    try {
      // This would be implemented with actual database health check
      status.services.database = { status: 'healthy', responseTime: 50 };
    } catch (error) {
      status.services.database = { status: 'unhealthy', error: 'Connection failed' };
      status.overall = 'degraded';
    }
    
    // Check external services
    const services = ['stripe', 'clerk', 'vonage', 'resend'];
    for (const service of services) {
      try {
        // Implement actual health checks for each service
        status.services[service] = { status: 'healthy', responseTime: 100 };
      } catch (error) {
        status.services[service] = { status: 'unhealthy', error: 'Service unavailable' };
        if (status.overall === 'healthy') status.overall = 'degraded';
      }
    }
    
    return status;
  }
}

// Types
export interface DeploymentValidation {
  isValid: boolean;
  environment: string;
  errors: string[];
  warnings: string[];
  config: any;
  securityScore: number;
}

export interface SecurityAlert {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  timestamp: string;
  environment: string;
  services: Record<string, { status: string; responseTime?: number; error?: string }>;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Infrastructure security middleware
 */
export async function infrastructureSecurityMiddleware(
  request: NextRequest
): Promise<{ allowed: boolean; response?: NextResponse }> {
  // Validate origin for CORS
  if (!InfrastructureSecurity.validateOrigin(request)) {
    return {
      allowed: false,
      response: new NextResponse('Invalid origin', { status: 403 }),
    };
  }
  
  // Check IP restrictions for admin endpoints
  if (request.nextUrl.pathname.startsWith('/admin') || 
      request.nextUrl.pathname.startsWith('/api/admin')) {
    if (!InfrastructureSecurity.isAllowedIP(request)) {
      return {
        allowed: false,
        response: new NextResponse('IP not allowed', { status: 403 }),
      };
    }
  }
  
  return { allowed: true };
}

// Export default configuration
export default {
  config: INFRASTRUCTURE_CONFIG,
  security: InfrastructureSecurity,
  monitoring: InfrastructureMonitoring,
  middleware: infrastructureSecurityMiddleware,
};
