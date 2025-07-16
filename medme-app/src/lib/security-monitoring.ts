/**
 * Advanced Security Monitoring and Threat Detection
 * Implements real-time security monitoring, threat detection, and incident response
 */

import { NextRequest } from 'next/server';
import { logSecurityEvent } from './audit';
import { AuditAction, AuditSeverity } from './models/AuditLog';

// Security monitoring configuration
export const SECURITY_CONFIG = {
  // Rate limiting thresholds
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    API_REQUESTS: { max: 100, window: 60 * 1000 }, // 100 requests per minute
    PASSWORD_RESET: { max: 3, window: 60 * 60 * 1000 }, // 3 resets per hour
    PAYMENT_ATTEMPTS: { max: 3, window: 30 * 60 * 1000 }, // 3 payment attempts per 30 minutes
  },
  
  // Suspicious activity patterns
  THREAT_PATTERNS: {
    SQL_INJECTION: [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /(\'|\"|;|--|\*|\/\*|\*\/)/,
      /(\bor\b|\band\b).*(\=|\<|\>)/i
    ],
    XSS_PATTERNS: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ],
    SUSPICIOUS_PATHS: [
      /\/admin/,
      /\/wp-admin/,
      /\/phpmyadmin/,
      /\/\.env/,
      /\/config/,
      /\/backup/
    ]
  },
  
  // Geographic restrictions (if needed)
  BLOCKED_COUNTRIES: [], // Add country codes if geographic restrictions are needed
  
  // IP whitelist for admin access (production)
  ADMIN_IP_WHITELIST: [], // Add trusted IP ranges for admin access
};

// In-memory stores (use Redis in production)
const securityStore = {
  failedAttempts: new Map<string, { count: number; lastAttempt: number; blocked: boolean }>(),
  suspiciousIPs: new Map<string, { score: number; lastActivity: number; incidents: string[] }>(),
  activeSessions: new Map<string, { ip: string; userAgent: string; lastActivity: number }>(),
};

/**
 * Security threat detection
 */
export class ThreatDetector {
  /**
   * Analyze request for potential threats
   */
  static analyzeRequest(request: NextRequest): ThreatAnalysis {
    const threats: string[] = [];
    const severity = this.calculateSeverity(request);
    
    // Check for SQL injection patterns
    const url = request.url;
    const userAgent = request.headers.get('user-agent') || '';
    
    for (const pattern of SECURITY_CONFIG.THREAT_PATTERNS.SQL_INJECTION) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        threats.push('SQL_INJECTION_ATTEMPT');
        break;
      }
    }
    
    // Check for XSS patterns
    for (const pattern of SECURITY_CONFIG.THREAT_PATTERNS.XSS_PATTERNS) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        threats.push('XSS_ATTEMPT');
        break;
      }
    }
    
    // Check for suspicious paths
    for (const pattern of SECURITY_CONFIG.THREAT_PATTERNS.SUSPICIOUS_PATHS) {
      if (pattern.test(new URL(url).pathname)) {
        threats.push('SUSPICIOUS_PATH_ACCESS');
        break;
      }
    }
    
    // Check user agent for bots/scanners
    if (this.isSuspiciousUserAgent(userAgent)) {
      threats.push('SUSPICIOUS_USER_AGENT');
    }
    
    return {
      threats,
      severity,
      riskScore: this.calculateRiskScore(threats, severity),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Check if user agent is suspicious
   */
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
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
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
  
  /**
   * Calculate threat severity
   */
  private static calculateSeverity(request: NextRequest): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const url = new URL(request.url);
    
    // Critical paths
    if (url.pathname.includes('/admin') || url.pathname.includes('/api/admin')) {
      return 'CRITICAL';
    }
    
    // High risk paths
    if (url.pathname.includes('/api/') || url.pathname.includes('/dashboard')) {
      return 'HIGH';
    }
    
    // Medium risk for authenticated areas
    if (url.pathname.includes('/profile') || url.pathname.includes('/settings')) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }
  
  /**
   * Calculate risk score (0-100)
   */
  private static calculateRiskScore(threats: string[], severity: string): number {
    let score = 0;
    
    // Base score by severity
    switch (severity) {
      case 'CRITICAL': score += 40; break;
      case 'HIGH': score += 30; break;
      case 'MEDIUM': score += 20; break;
      case 'LOW': score += 10; break;
    }
    
    // Add points for each threat
    threats.forEach(threat => {
      switch (threat) {
        case 'SQL_INJECTION_ATTEMPT': score += 30; break;
        case 'XSS_ATTEMPT': score += 25; break;
        case 'SUSPICIOUS_PATH_ACCESS': score += 20; break;
        case 'SUSPICIOUS_USER_AGENT': score += 15; break;
        default: score += 10;
      }
    });
    
    return Math.min(score, 100);
  }
}

/**
 * Security incident response
 */
export class IncidentResponse {
  /**
   * Handle security incident
   */
  static async handleIncident(
    request: NextRequest,
    analysis: ThreatAnalysis,
    userId?: string
  ): Promise<SecurityAction> {
    const ip = this.getClientIP(request);
    const action = this.determineAction(analysis);
    
    // Log security incident
    await logSecurityEvent(
      AuditAction.SECURITY_INCIDENT,
      this.mapSeverityToAudit(analysis.severity),
      `Security incident detected: ${analysis.threats.join(', ')}`,
      userId,
      request,
      undefined,
      {
        threats: analysis.threats,
        riskScore: analysis.riskScore,
        ip,
        userAgent: request.headers.get('user-agent'),
        action: action.type
      }
    );
    
    // Update IP reputation
    this.updateIPReputation(ip, analysis);
    
    // Take action based on risk level
    if (action.type === 'BLOCK') {
      this.blockIP(ip, action.duration);
    }
    
    return action;
  }
  
  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           'unknown';
  }
  
  /**
   * Determine security action based on analysis
   */
  private static determineAction(analysis: ThreatAnalysis): SecurityAction {
    if (analysis.riskScore >= 80) {
      return { type: 'BLOCK', duration: 24 * 60 * 60 * 1000 }; // 24 hours
    }
    
    if (analysis.riskScore >= 60) {
      return { type: 'RATE_LIMIT', duration: 60 * 60 * 1000 }; // 1 hour
    }
    
    if (analysis.riskScore >= 40) {
      return { type: 'MONITOR', duration: 30 * 60 * 1000 }; // 30 minutes
    }
    
    return { type: 'ALLOW', duration: 0 };
  }
  
  /**
   * Update IP reputation score
   */
  private static updateIPReputation(ip: string, analysis: ThreatAnalysis): void {
    const current = securityStore.suspiciousIPs.get(ip) || {
      score: 0,
      lastActivity: Date.now(),
      incidents: []
    };
    
    current.score += analysis.riskScore;
    current.lastActivity = Date.now();
    current.incidents.push(...analysis.threats);
    
    // Keep only recent incidents (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (current.lastActivity < oneDayAgo) {
      current.score = Math.max(0, current.score - 10); // Decay score
    }
    
    securityStore.suspiciousIPs.set(ip, current);
  }
  
  /**
   * Block IP address
   */
  private static blockIP(ip: string, duration: number): void {
    securityStore.failedAttempts.set(ip, {
      count: 999,
      lastAttempt: Date.now(),
      blocked: true
    });
    
    // Auto-unblock after duration
    setTimeout(() => {
      securityStore.failedAttempts.delete(ip);
    }, duration);
  }
  
  /**
   * Map severity to audit severity
   */
  private static mapSeverityToAudit(severity: string): AuditSeverity {
    switch (severity) {
      case 'CRITICAL': return AuditSeverity.CRITICAL;
      case 'HIGH': return AuditSeverity.HIGH;
      case 'MEDIUM': return AuditSeverity.MEDIUM;
      default: return AuditSeverity.LOW;
    }
  }
}

/**
 * Check if IP is blocked
 */
export function isIPBlocked(ip: string): boolean {
  const record = securityStore.failedAttempts.get(ip);
  return record?.blocked === true;
}

/**
 * Get IP reputation score
 */
export function getIPReputation(ip: string): number {
  const record = securityStore.suspiciousIPs.get(ip);
  return record?.score || 0;
}

// Types
export interface ThreatAnalysis {
  threats: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  timestamp: string;
}

export interface SecurityAction {
  type: 'ALLOW' | 'MONITOR' | 'RATE_LIMIT' | 'BLOCK';
  duration: number; // milliseconds
}

/**
 * Security monitoring middleware
 */
export async function securityMonitoringMiddleware(request: NextRequest): Promise<{
  allowed: boolean;
  action?: SecurityAction;
  analysis?: ThreatAnalysis;
}> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';
  
  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    return { allowed: false };
  }
  
  // Analyze request for threats
  const analysis = ThreatDetector.analyzeRequest(request);
  
  // Handle high-risk requests
  if (analysis.riskScore >= 40) {
    const action = await IncidentResponse.handleIncident(request, analysis);
    
    if (action.type === 'BLOCK') {
      return { allowed: false, action, analysis };
    }
  }
  
  return { allowed: true, analysis };
}
