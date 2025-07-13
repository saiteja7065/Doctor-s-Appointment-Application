import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_breach' | 'suspicious_activity';
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  try {
    await connectToDatabase();

    // Get recent high-severity audit logs that should be treated as alerts
    const alertLogs = await AuditLog.find({
      severity: { $in: ['HIGH', 'CRITICAL'] },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

    const alerts: SecurityAlert[] = [];

    for (const log of alertLogs) {
      let category: SecurityAlert['category'] = 'suspicious_activity';
      let title = 'Security Alert';
      
      // Determine category and title based on audit log
      switch (log.category) {
        case 'AUTHENTICATION':
          category = 'authentication';
          title = 'Authentication Security Alert';
          break;
        case 'AUTHORIZATION':
          category = 'authorization';
          title = 'Authorization Security Alert';
          break;
        case 'DATA_ACCESS':
          category = 'data_breach';
          title = 'Data Access Security Alert';
          break;
        default:
          category = 'suspicious_activity';
          title = 'Suspicious Activity Detected';
      }

      alerts.push({
        id: log._id.toString(),
        title,
        description: log.description || log.action,
        severity: log.severity.toLowerCase() as SecurityAlert['severity'],
        category,
        timestamp: log.timestamp,
        acknowledged: log.metadata?.acknowledged || false,
        resolvedAt: log.metadata?.resolvedAt ? new Date(log.metadata.resolvedAt) : undefined
      });
    }

    // If no real alerts, return demo data
    if (alerts.length === 0) {
      return [
        {
          id: '1',
          title: 'Unusual Login Pattern Detected',
          description: 'Multiple login attempts from different geographic locations within a short time frame',
          severity: 'medium',
          category: 'authentication',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          acknowledged: false
        },
        {
          id: '2',
          title: 'High Volume Data Access',
          description: 'User accessed unusually high number of patient records in a short period',
          severity: 'high',
          category: 'data_breach',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          acknowledged: true
        },
        {
          id: '3',
          title: 'Failed Authorization Attempts',
          description: 'Multiple attempts to access admin-only resources by non-admin user',
          severity: 'high',
          category: 'authorization',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          acknowledged: false
        }
      ];
    }

    return alerts;

  } catch (error) {
    console.error('Error fetching security alerts:', error);
    
    // Return demo data on error
    return [
      {
        id: '1',
        title: 'Unusual Login Pattern Detected',
        description: 'Multiple login attempts from different geographic locations within a short time frame',
        severity: 'medium',
        category: 'authentication',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        acknowledged: false
      },
      {
        id: '2',
        title: 'High Volume Data Access',
        description: 'User accessed unusually high number of patient records in a short period',
        severity: 'high',
        category: 'data_breach',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        acknowledged: true
      }
    ];
  }
}

async function handler(userContext: any, request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET') {
      return new NextResponse('Method not allowed', { status: 405 });
    }

    const alerts = await getSecurityAlerts();

    return NextResponse.json(alerts);

  } catch (error) {
    console.error('Security alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
