import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';
import { logSecurityEvent, AuditAction, AuditSeverity } from '@/lib/auth-audit';

async function handler(
  userContext: any, 
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    if (request.method !== 'POST') {
      return new NextResponse('Method not allowed', { status: 405 });
    }

    const alertId = params.id;

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find and update the audit log to mark as resolved
    const auditLog = await AuditLog.findById(alertId);

    if (!auditLog) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Update the audit log metadata to mark as resolved
    auditLog.metadata = {
      ...auditLog.metadata,
      resolved: true,
      resolvedBy: userContext.userId,
      resolvedAt: new Date().toISOString(),
      acknowledged: true, // Auto-acknowledge when resolving
      acknowledgedBy: userContext.userId,
      acknowledgedAt: new Date().toISOString()
    };

    await auditLog.save();

    // Log the resolution action
    await logSecurityEvent(
      AuditAction.SECURITY_ALERT_RESOLVED,
      AuditSeverity.LOW,
      `Security alert ${alertId} resolved by admin`,
      userContext.clerkId,
      request,
      undefined,
      {
        alertId,
        originalSeverity: auditLog.severity,
        originalAction: auditLog.action,
        resolutionTime: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving security alert:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(handler);
