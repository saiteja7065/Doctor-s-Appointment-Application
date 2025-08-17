import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import AuditLog, { AuditAction, AuditCategory, AuditSeverity, IAuditLog } from './models/AuditLog';
import { connectToDatabase } from './mongodb';
// Simple sanitization function for logging
function sanitizeForLogging(data: any): any {
  if (typeof data === 'string') {
    // Remove sensitive patterns
    return data.replace(/password|token|secret|key/gi, '[REDACTED]');
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }
  return data;
}

// Audit log entry interface
export interface AuditLogEntry {
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  userId?: string;
  clerkId?: string;
  targetUserId?: string;
  targetResourceId?: string;
  targetResourceType?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    requestId?: string;
    sessionId?: string;
    previousValue?: any;
    newValue?: any;
    errorMessage?: string;
    stackTrace?: string;
    additionalData?: Record<string, any>;
  };
}

// Request metadata extraction
export function extractRequestMetadata(request: NextRequest): {
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
} {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    endpoint: request.nextUrl.pathname,
    method: request.method,
    requestId: request.headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

// Core audit logging function
export async function createAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      console.warn('Database not available - audit log skipped');
      return false;
    }

    // Sanitize sensitive data in metadata
    const sanitizedMetadata = entry.metadata ? {
      ...entry.metadata,
      previousValue: sanitizeForLogging(entry.metadata.previousValue),
      newValue: sanitizeForLogging(entry.metadata.newValue),
      additionalData: sanitizeForLogging(entry.metadata.additionalData),
    } : undefined;

    // Create audit log entry
    const auditLogData: Partial<IAuditLog> = {
      action: entry.action,
      category: entry.category,
      severity: entry.severity,
      description: entry.description,
      clerkId: entry.clerkId,
      targetUserId: entry.targetUserId ? entry.targetUserId : undefined,
      targetResourceId: entry.targetResourceId,
      targetResourceType: entry.targetResourceType,
      metadata: sanitizedMetadata,
      timestamp: new Date(),
    };

    await AuditLog.createLog(auditLogData);
    return true;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return false;
  }
}

// Authentication audit logging
export async function logAuthenticationEvent(
  action: AuditAction,
  clerkId: string,
  request?: NextRequest,
  additionalData?: Record<string, any>
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.AUTHENTICATION,
    severity: AuditSeverity.MEDIUM,
    description: `User authentication event: ${action}`,
    clerkId,
    metadata: {
      ...metadata,
      additionalData,
    },
  });
}

// User management audit logging
export async function logUserManagementEvent(
  action: AuditAction,
  adminClerkId: string,
  targetUserId: string,
  description: string,
  request?: NextRequest,
  previousValue?: any,
  newValue?: any
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.USER_MANAGEMENT,
    severity: AuditSeverity.HIGH,
    description,
    clerkId: adminClerkId,
    targetUserId,
    metadata: {
      ...metadata,
      previousValue,
      newValue,
    },
  });
}

// Appointment audit logging
export async function logAppointmentEvent(
  action: AuditAction,
  clerkId: string,
  appointmentId: string,
  description: string,
  request?: NextRequest,
  additionalData?: Record<string, any>
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.APPOINTMENT,
    severity: AuditSeverity.MEDIUM,
    description,
    clerkId,
    targetResourceId: appointmentId,
    targetResourceType: 'appointment',
    metadata: {
      ...metadata,
      additionalData,
    },
  });
}

// Payment audit logging
export async function logPaymentEvent(
  action: AuditAction,
  clerkId: string,
  paymentId: string,
  amount: number,
  description: string,
  request?: NextRequest,
  additionalData?: Record<string, any>
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.PAYMENT,
    severity: AuditSeverity.HIGH,
    description,
    clerkId,
    targetResourceId: paymentId,
    targetResourceType: 'payment',
    metadata: {
      ...metadata,
      additionalData: {
        amount,
        ...additionalData,
      },
    },
  });
}

// Video consultation audit logging
export async function logVideoConsultationEvent(
  action: AuditAction,
  clerkId: string,
  sessionId: string,
  description: string,
  request?: NextRequest,
  additionalData?: Record<string, any>
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.VIDEO_CONSULTATION,
    severity: AuditSeverity.MEDIUM,
    description,
    clerkId,
    targetResourceId: sessionId,
    targetResourceType: 'video_session',
    metadata: {
      ...metadata,
      additionalData,
    },
  });
}

// Admin action audit logging
export async function logAdminAction(
  action: AuditAction,
  adminClerkId: string,
  targetResourceId: string,
  targetResourceType: string,
  description: string,
  request?: NextRequest,
  previousValue?: any,
  newValue?: any
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.ADMIN,
    severity: AuditSeverity.HIGH,
    description,
    clerkId: adminClerkId,
    targetResourceId,
    targetResourceType,
    metadata: {
      ...metadata,
      previousValue,
      newValue,
    },
  });
}

// Security event audit logging
export async function logSecurityEvent(
  action: AuditAction,
  severity: AuditSeverity,
  description: string,
  clerkId?: string,
  request?: NextRequest,
  errorMessage?: string,
  additionalData?: Record<string, any>
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.SECURITY,
    severity,
    description,
    clerkId,
    metadata: {
      ...metadata,
      errorMessage,
      additionalData,
    },
  });
}

// System event audit logging
export async function logSystemEvent(
  action: AuditAction,
  severity: AuditSeverity,
  description: string,
  errorMessage?: string,
  stackTrace?: string,
  additionalData?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action,
    category: AuditCategory.SYSTEM,
    severity,
    description,
    metadata: {
      errorMessage,
      stackTrace,
      additionalData,
    },
  });
}

// Audit middleware for API routes
export async function auditMiddleware(
  request: NextRequest,
  action: AuditAction,
  category: AuditCategory,
  description: string,
  severity: AuditSeverity = AuditSeverity.MEDIUM
): Promise<void> {
  try {
    const { userId } = await auth();
    const metadata = extractRequestMetadata(request);
    
    await createAuditLog({
      action,
      category,
      severity,
      description,
      clerkId: userId || undefined,
      metadata,
    });
  } catch (error) {
    console.error('Audit middleware error:', error);
    // Don't throw error to prevent breaking the main application flow
  }
}

// Bulk audit log creation for batch operations
export async function createBulkAuditLogs(entries: AuditLogEntry[]): Promise<number> {
  let successCount = 0;
  
  for (const entry of entries) {
    const success = await createAuditLog(entry);
    if (success) successCount++;
  }
  
  return successCount;
}

// Query audit logs with filters
export interface AuditLogQuery {
  userId?: string;
  clerkId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  severity?: AuditSeverity;
  targetResourceId?: string;
  targetResourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}

export async function queryAuditLogs(query: AuditLogQuery): Promise<IAuditLog[]> {
  try {
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return [];
    }

    const filter: any = {};
    
    if (query.clerkId) filter.clerkId = query.clerkId;
    if (query.action) filter.action = query.action;
    if (query.category) filter.category = query.category;
    if (query.severity) filter.severity = query.severity;
    if (query.targetResourceId) filter.targetResourceId = query.targetResourceId;
    if (query.targetResourceType) filter.targetResourceType = query.targetResourceType;
    
    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) filter.timestamp.$gte = query.startDate;
      if (query.endDate) filter.timestamp.$lte = query.endDate;
    }

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(query.limit || 100)
      .skip(query.skip || 0)
      .lean();

    return logs;
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    return [];
  }
}
