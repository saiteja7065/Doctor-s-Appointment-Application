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

    // Find and update the audit log to mark as acknowledged
    const auditLog = await AuditLog.findById(alertId);

    if (!auditLog) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Update the audit log metadata to mark as acknowledged
    auditLog.metadata = {
      ...auditLog.metadata,
      acknowledged: true,
      acknowledgedBy: userContext.userId,
      acknowledgedAt: new Date().toISOString()
    };

    await auditLog.save();

    // Log the acknowledgment action
    await logSecurityEvent(
      AuditAction.SECURITY_ALERT_ACKNOWLEDGED,
      AuditSeverity.LOW,
      `Security alert ${alertId} acknowledged by admin`,
      userContext.clerkId,
      request,
      undefined,
      {
        alertId,
        originalSeverity: auditLog.severity,
        originalAction: auditLog.action
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    console.error('Error acknowledging security alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(handler);
