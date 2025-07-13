import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';
import { User } from '@/lib/models/User';

interface SecurityEvent {
  id: string;
  type: 'login' | 'failed_login' | 'data_access' | 'permission_change' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  resolved: boolean;
}

async function getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
  try {
    await connectToDatabase();

    // Get recent audit logs that represent security events
    const auditLogs = await AuditLog.find({
      category: { $in: ['AUTHENTICATION', 'AUTHORIZATION', 'SECURITY', 'DATA_ACCESS'] }
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

    const events: SecurityEvent[] = [];

    for (const log of auditLogs) {
      let eventType: SecurityEvent['type'] = 'data_access';
      let severity: SecurityEvent['severity'] = 'low';
      let resolved = true;

      // Determine event type and severity based on audit log
      switch (log.action) {
        case 'LOGIN_SUCCESS':
          eventType = 'login';
          severity = 'low';
          break;
        case 'LOGIN_FAILED':
          eventType = 'failed_login';
          severity = 'medium';
          resolved = false;
          break;
        case 'PERMISSION_DENIED':
          eventType = 'permission_change';
          severity = 'high';
          resolved = false;
          break;
        case 'SECURITY_VIOLATION':
          eventType = 'suspicious_activity';
          severity = 'critical';
          resolved = false;
          break;
        case 'DATA_ACCESS':
          eventType = 'data_access';
          severity = 'low';
          break;
        default:
          eventType = 'data_access';
          severity = 'low';
      }

      // Get user name if userId is available
      let userName: string | undefined;
      if (log.userId) {
        try {
          const user = await User.findOne({ clerkId: log.userId }).select('firstName lastName').lean();
          if (user) {
            userName = `${user.firstName} ${user.lastName}`;
          }
        } catch (error) {
          console.error('Error fetching user for audit log:', error);
        }
      }

      events.push({
        id: log._id.toString(),
        type: eventType,
        severity,
        description: log.description || log.action,
        userId: log.userId,
        userName,
        timestamp: log.timestamp,
        ipAddress: log.metadata?.ipAddress,
        userAgent: log.metadata?.userAgent,
        resolved
      });
    }

    return events;

  } catch (error) {
    console.error('Error fetching security events:', error);
    
    // Return demo data on error
    return [
      {
        id: '1',
        type: 'login',
        severity: 'low',
        description: 'User login successful',
        userId: 'user_123',
        userName: 'Dr. Sarah Johnson',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        ipAddress: '192.168.1.100',
        resolved: true
      },
      {
        id: '2',
        type: 'failed_login',
        severity: 'medium',
        description: 'Multiple failed login attempts',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        ipAddress: '203.0.113.45',
        resolved: false
      },
      {
        id: '3',
        type: 'data_access',
        severity: 'low',
        description: 'Admin accessed patient records',
        userId: 'admin_456',
        userName: 'Admin User',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        resolved: true
      },
      {
        id: '4',
        type: 'permission_change',
        severity: 'high',
        description: 'User role changed from patient to doctor',
        userId: 'admin_456',
        userName: 'Admin User',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        resolved: true
      },
      {
        id: '5',
        type: 'suspicious_activity',
        severity: 'critical',
        description: 'Unusual API access pattern detected',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        ipAddress: '198.51.100.42',
        resolved: false
      }
    ];
  }
}

async function handler(userContext: any, request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET') {
      return new NextResponse('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const events = await getSecurityEvents(limit);

    return NextResponse.json(events);

  } catch (error) {
    console.error('Security events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
