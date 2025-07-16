/**
 * Edge Runtime Compatible Audit Logging
 * Simplified audit logging for middleware that works in Edge Runtime
 */

import { NextRequest } from 'next/server';

// Audit action types (simplified for edge runtime)
export enum AuditAction {
  // Security actions
  SECURITY_INCIDENT = 'security_incident',
  SECURITY_VIOLATION = 'security_violation',
  SECURITY_ACCESS_GRANTED = 'security_access_granted',
  SECURITY_ACCESS_DENIED = 'security_access_denied',
  SECURITY_ALERT = 'security_alert',
  
  // Authentication actions
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  
  // System actions
  SYSTEM_ERROR = 'system_error',
  SYSTEM_WARNING = 'system_warning',
  
  // Monitoring actions
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  CSP_VIOLATION = 'csp_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

// Audit severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Simplified audit log entry for edge runtime
export interface EdgeAuditLogEntry {
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  description: string;
  userId?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    [key: string]: any;
  };
}

/**
 * Extract client information from request
 */
function extractClientInfo(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               request.ip ||
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    endpoint: request.nextUrl.pathname,
    method: request.method,
  };
}

/**
 * Log security event (Edge Runtime compatible)
 * This function queues the audit log for processing by API routes
 */
export async function logSecurityEventEdge(
  action: AuditAction,
  severity: AuditSeverity,
  description: string,
  userId?: string,
  request?: NextRequest,
  error?: string,
  additionalMetadata?: Record<string, any>
): Promise<void> {
  try {
    const auditEntry: EdgeAuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      severity,
      description,
      userId,
      metadata: {
        ...(request ? extractClientInfo(request) : {}),
        ...(error && { error }),
        ...additionalMetadata,
      },
    };

    // In Edge Runtime, we can't directly write to database
    // Instead, we'll send the audit log to an API route for processing
    if (typeof fetch !== 'undefined') {
      // Queue the audit log for processing
      // Use fire-and-forget approach to avoid blocking the middleware
      fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditEntry),
      }).catch(() => {
        // Silently fail - don't break the middleware
        // In production, you might want to use a different logging mechanism
      });
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${severity.toUpperCase()}: ${action} - ${description}`, auditEntry.metadata);
    }

  } catch (error) {
    // Silently fail - audit logging should never break the application
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to log audit event:', error);
    }
  }
}

/**
 * Create a simplified audit logger for specific actions
 */
export function createAuditLogger(defaultAction: AuditAction, defaultSeverity: AuditSeverity) {
  return (
    description: string,
    userId?: string,
    request?: NextRequest,
    metadata?: Record<string, any>
  ) => logSecurityEventEdge(defaultAction, defaultSeverity, description, userId, request, undefined, metadata);
}

/**
 * Pre-configured audit loggers for common security events
 */
export const securityLoggers = {
  incident: createAuditLogger(AuditAction.SECURITY_INCIDENT, AuditSeverity.HIGH),
  violation: createAuditLogger(AuditAction.SECURITY_VIOLATION, AuditSeverity.MEDIUM),
  accessGranted: createAuditLogger(AuditAction.SECURITY_ACCESS_GRANTED, AuditSeverity.LOW),
  accessDenied: createAuditLogger(AuditAction.SECURITY_ACCESS_DENIED, AuditSeverity.MEDIUM),
  alert: createAuditLogger(AuditAction.SECURITY_ALERT, AuditSeverity.HIGH),
  suspiciousActivity: createAuditLogger(AuditAction.SUSPICIOUS_ACTIVITY, AuditSeverity.MEDIUM),
  rateLimitExceeded: createAuditLogger(AuditAction.RATE_LIMIT_EXCEEDED, AuditSeverity.MEDIUM),
};

/**
 * Sanitize sensitive data for logging
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data === 'string') {
    return data.replace(/password|token|secret|key|authorization/gi, '[REDACTED]');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().match(/(password|token|secret|key|auth|credential)/)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Format audit log entry for console output
 */
export function formatAuditLogForConsole(entry: EdgeAuditLogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleString();
  const severity = entry.severity.toUpperCase().padEnd(8);
  const action = entry.action.padEnd(25);
  
  return `[${timestamp}] ${severity} ${action} ${entry.description}`;
}

/**
 * Batch audit log entries for efficient processing
 */
class AuditLogBatcher {
  private batch: EdgeAuditLogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private timer?: NodeJS.Timeout;

  constructor() {
    if (typeof window === 'undefined') {
      this.startBatchTimer();
    }
  }

  add(entry: EdgeAuditLogEntry) {
    this.batch.push(entry);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  private startBatchTimer() {
    this.timer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush() {
    if (this.batch.length === 0) return;

    const entries = [...this.batch];
    this.batch = [];

    try {
      await fetch('/api/audit/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries }),
      });
    } catch (error) {
      // Silently fail
    }
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.flush();
  }
}

// Export a singleton batcher for use across the application
export const auditBatcher = new AuditLogBatcher();

/**
 * High-level audit logging function that uses batching
 */
export function auditLog(
  action: AuditAction,
  severity: AuditSeverity,
  description: string,
  options?: {
    userId?: string;
    request?: NextRequest;
    metadata?: Record<string, any>;
    immediate?: boolean; // Skip batching for critical events
  }
) {
  const entry: EdgeAuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    severity,
    description,
    userId: options?.userId,
    metadata: {
      ...(options?.request ? extractClientInfo(options.request) : {}),
      ...options?.metadata,
    },
  };

  if (options?.immediate || severity === AuditSeverity.CRITICAL) {
    // Send immediately for critical events
    logSecurityEventEdge(action, severity, description, options?.userId, options?.request, undefined, options?.metadata);
  } else {
    // Use batching for non-critical events
    auditBatcher.add(entry);
  }
}

export default {
  logSecurityEventEdge,
  securityLoggers,
  auditLog,
  AuditAction,
  AuditSeverity,
};
