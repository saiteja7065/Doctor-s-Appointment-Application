import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logAuthenticationEvent, logSecurityEvent } from './audit';
import { AuditAction, AuditSeverity } from './models/AuditLog';

// Track failed login attempts
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Authentication event logging
export async function logUserLogin(request: NextRequest, clerkId: string): Promise<void> {
  await logAuthenticationEvent(
    AuditAction.USER_LOGIN,
    clerkId,
    request,
    {
      loginTime: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown',
    }
  );
}

export async function logUserLogout(request: NextRequest, clerkId: string): Promise<void> {
  await logAuthenticationEvent(
    AuditAction.USER_LOGOUT,
    clerkId,
    request,
    {
      logoutTime: new Date().toISOString(),
    }
  );
}

export async function logUserRegistration(request: NextRequest, clerkId: string, userRole: string): Promise<void> {
  await logAuthenticationEvent(
    AuditAction.USER_REGISTER,
    clerkId,
    request,
    {
      registrationTime: new Date().toISOString(),
      role: userRole,
    }
  );
}

export async function logPasswordReset(request: NextRequest, clerkId: string): Promise<void> {
  await logAuthenticationEvent(
    AuditAction.PASSWORD_RESET,
    clerkId,
    request,
    {
      resetTime: new Date().toISOString(),
    }
  );
}

// Security event logging
export async function logFailedLoginAttempt(request: NextRequest, identifier: string): Promise<void> {
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  // Track failed attempts
  const attempts = failedLoginAttempts.get(ipAddress) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = now;
  failedLoginAttempts.set(ipAddress, attempts);
  
  // Determine severity based on attempt count
  let severity = AuditSeverity.LOW;
  if (attempts.count >= 10) {
    severity = AuditSeverity.CRITICAL;
  } else if (attempts.count >= 5) {
    severity = AuditSeverity.HIGH;
  } else if (attempts.count >= 3) {
    severity = AuditSeverity.MEDIUM;
  }
  
  await logSecurityEvent(
    AuditAction.SECURITY_FAILED_LOGIN,
    severity,
    `Failed login attempt for identifier: ${identifier}`,
    undefined,
    request,
    undefined,
    {
      identifier,
      attemptCount: attempts.count,
      consecutiveFailures: attempts.count,
    }
  );
  
  // Log suspicious activity if too many attempts
  if (attempts.count >= 5) {
    await logSecurityEvent(
      AuditAction.SECURITY_SUSPICIOUS_ACTIVITY,
      AuditSeverity.HIGH,
      `Suspicious activity detected: ${attempts.count} failed login attempts from IP ${ipAddress}`,
      undefined,
      request,
      undefined,
      {
        activityType: 'multiple_failed_logins',
        attemptCount: attempts.count,
        timeWindow: '24h',
      }
    );
  }
}

export async function logSuccessfulLogin(request: NextRequest, clerkId: string): Promise<void> {
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // Clear failed attempts on successful login
  failedLoginAttempts.delete(ipAddress);
  
  await logSecurityEvent(
    AuditAction.SECURITY_LOGIN_ATTEMPT,
    AuditSeverity.LOW,
    `Successful login for user: ${clerkId}`,
    clerkId,
    request
  );
}

export async function logPermissionDenied(request: NextRequest, clerkId: string, resource: string, action: string): Promise<void> {
  await logSecurityEvent(
    AuditAction.SECURITY_PERMISSION_DENIED,
    AuditSeverity.MEDIUM,
    `Permission denied for user ${clerkId} attempting ${action} on ${resource}`,
    clerkId,
    request,
    undefined,
    {
      resource,
      action,
      deniedAt: new Date().toISOString(),
    }
  );
}

export async function logSuspiciousDataAccess(request: NextRequest, clerkId: string, dataType: string, reason: string): Promise<void> {
  await logSecurityEvent(
    AuditAction.SECURITY_SUSPICIOUS_ACTIVITY,
    AuditSeverity.HIGH,
    `Suspicious data access: ${reason}`,
    clerkId,
    request,
    undefined,
    {
      dataType,
      reason,
      accessTime: new Date().toISOString(),
    }
  );
}

// Middleware for automatic authentication logging
export async function authAuditMiddleware(request: NextRequest): Promise<void> {
  try {
    const { userId } = await auth();
    
    // Only log for authenticated requests
    if (userId) {
      const pathname = request.nextUrl.pathname;
      
      // Log data access for sensitive endpoints
      if (pathname.includes('/api/admin/') || 
          pathname.includes('/api/patients/') || 
          pathname.includes('/api/doctors/')) {
        
        await logSecurityEvent(
          AuditAction.SECURITY_DATA_ACCESS,
          AuditSeverity.LOW,
          `User accessed ${pathname}`,
          userId,
          request,
          undefined,
          {
            endpoint: pathname,
            method: request.method,
            accessTime: new Date().toISOString(),
          }
        );
      }
    }
  } catch (error) {
    console.error('Auth audit middleware error:', error);
    // Don't throw error to prevent breaking the main application flow
  }
}

// Clean up old failed login attempts (call this periodically)
export function cleanupFailedLoginAttempts(): number {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  let cleaned = 0;
  
  for (const [ip, attempts] of failedLoginAttempts.entries()) {
    if (now - attempts.lastAttempt > twentyFourHours) {
      failedLoginAttempts.delete(ip);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Get current failed login attempt statistics
export function getFailedLoginStats(): {
  totalIPs: number;
  totalAttempts: number;
  highRiskIPs: string[];
} {
  let totalAttempts = 0;
  const highRiskIPs: string[] = [];
  
  for (const [ip, attempts] of failedLoginAttempts.entries()) {
    totalAttempts += attempts.count;
    if (attempts.count >= 5) {
      highRiskIPs.push(ip);
    }
  }
  
  return {
    totalIPs: failedLoginAttempts.size,
    totalAttempts,
    highRiskIPs,
  };
}
