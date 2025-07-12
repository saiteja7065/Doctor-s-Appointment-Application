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

// Extract request metadata for audit logging
function extractRequestMetadata(request: NextRequest): Record<string, any> {
  return {
    ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    endpoint: request.nextUrl.pathname,
    method: request.method,
    requestId: request.headers.get('x-request-id') || undefined,
  };
}

// Core audit logging function
export async function createAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      console.warn('Database not available, skipping audit log creation');
      return false;
    }

    // Sanitize sensitive data
    const sanitizedEntry = {
      ...entry,
      metadata: entry.metadata ? sanitizeForLogging(entry.metadata) : undefined,
    };

    // Create audit log
    const auditLog = new AuditLog(sanitizedEntry);
    await auditLog.save();
    
    return true;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent breaking the main application flow
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
    description: `Authentication event: ${action}`,
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
    targetResourceId: targetUserId,
    targetResourceType: 'user',
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
  targetResourceId?: string,
  additionalData?: Record<string, any>
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};
  
  await createAuditLog({
    action,
    category: AuditCategory.SECURITY,
    severity,
    description,
    clerkId,
    targetResourceId,
    targetResourceType: 'security_event',
    metadata: {
      ...metadata,
      additionalData,
    },
  });
}

// System event audit logging
export async function logSystemEvent(
  action: AuditAction,
  description: string,
  severity: AuditSeverity = AuditSeverity.LOW,
  additionalData?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action,
    category: AuditCategory.SYSTEM,
    severity,
    description,
    metadata: {
      additionalData,
    },
  });
}

// Error audit logging
export async function logError(
  error: Error,
  context: string,
  clerkId?: string,
  request?: NextRequest,
  severity: AuditSeverity = AuditSeverity.HIGH
): Promise<void> {
  const metadata = request ? extractRequestMetadata(request) : {};

  await createAuditLog({
    action: AuditAction.SYSTEM_ERROR,
    category: AuditCategory.SYSTEM,
    severity,
    description: `Error in ${context}: ${error.message}`,
    clerkId,
    metadata: {
      ...metadata,
      errorMessage: error.message,
      stackTrace: error.stack,
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

export async function queryAuditLogs(query: AuditLogQuery): Promise<{
  logs: IAuditLog[];
  totalCount: number;
  hasMore: boolean;
}> {
  try {
    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      console.warn('Database not available, returning empty audit logs');
      return { logs: [], totalCount: 0, hasMore: false };
    }

    // Build MongoDB query
    const mongoQuery: any = {};

    if (query.userId) mongoQuery.userId = query.userId;
    if (query.clerkId) mongoQuery.clerkId = query.clerkId;
    if (query.action) mongoQuery.action = query.action;
    if (query.category) mongoQuery.category = query.category;
    if (query.severity) mongoQuery.severity = query.severity;
    if (query.targetResourceId) mongoQuery.targetResourceId = query.targetResourceId;
    if (query.targetResourceType) mongoQuery.targetResourceType = query.targetResourceType;

    // Date range filter
    if (query.startDate || query.endDate) {
      mongoQuery.timestamp = {};
      if (query.startDate) mongoQuery.timestamp.$gte = query.startDate;
      if (query.endDate) mongoQuery.timestamp.$lte = query.endDate;
    }

    // Execute query with pagination
    const limit = query.limit || 50;
    const skip = query.skip || 0;

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(mongoQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(mongoQuery)
    ]);

    return {
      logs: logs as IAuditLog[],
      totalCount,
      hasMore: skip + logs.length < totalCount,
    };
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    return { logs: [], totalCount: 0, hasMore: false };
  }
}
