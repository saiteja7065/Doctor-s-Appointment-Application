import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { queryAuditLogs, AuditLogQuery } from '@/lib/audit';
import { AuditAction, AuditCategory, AuditSeverity } from '@/lib/models/AuditLog';

async function handler(userContext: any, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query: AuditLogQuery = {
      clerkId: searchParams.get('clerkId') || undefined,
      action: searchParams.get('action') as AuditAction || undefined,
      category: searchParams.get('category') as AuditCategory || undefined,
      severity: searchParams.get('severity') as AuditSeverity || undefined,
      targetResourceId: searchParams.get('targetResourceId') || undefined,
      targetResourceType: searchParams.get('targetResourceType') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0,
    };

    // Validate limit and skip
    if (query.limit && (query.limit < 1 || query.limit > 1000)) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      );
    }

    if (query.skip && query.skip < 0) {
      return NextResponse.json(
        { error: 'Skip must be non-negative' },
        { status: 400 }
      );
    }

    // Query audit logs
    const logs = await queryAuditLogs(query);

    // Calculate statistics
    const stats = {
      total: logs.length,
      categories: {} as Record<string, number>,
      severities: {} as Record<string, number>,
      actions: {} as Record<string, number>,
    };

    logs.forEach(log => {
      // Count by category
      stats.categories[log.category] = (stats.categories[log.category] || 0) + 1;
      
      // Count by severity
      stats.severities[log.severity] = (stats.severities[log.severity] || 0) + 1;
      
      // Count by action
      stats.actions[log.action] = (stats.actions[log.action] || 0) + 1;
    });

    return NextResponse.json({
      logs,
      stats,
      query: {
        ...query,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString(),
      },
      message: 'Audit logs retrieved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);

// Export available filter options for the frontend
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    actions: Object.values(AuditAction),
    categories: Object.values(AuditCategory),
    severities: Object.values(AuditSeverity),
  }, { status: 200 });
}
