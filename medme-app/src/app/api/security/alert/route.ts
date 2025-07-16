/**
 * Security Alert API Endpoint
 * Handles security alerts and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/audit';
import { AuditAction, AuditSeverity } from '@/lib/models/AuditLog';
import { InfrastructureMonitoring } from '@/lib/infrastructure-security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, timestamp, metadata } = body;
    
    // Validate request
    if (!type || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, message' },
        { status: 400 }
      );
    }
    
    // Determine severity based on alert type
    let severity: AuditSeverity;
    switch (type) {
      case 'SECURITY_INIT_FAILURE':
      case 'CRITICAL_VULNERABILITY':
        severity = AuditSeverity.CRITICAL;
        break;
      case 'UNAUTHORIZED_ACCESS':
      case 'SUSPICIOUS_ACTIVITY':
        severity = AuditSeverity.HIGH;
        break;
      case 'CONFIGURATION_WARNING':
      case 'PERFORMANCE_DEGRADATION':
        severity = AuditSeverity.MEDIUM;
        break;
      default:
        severity = AuditSeverity.LOW;
    }
    
    // Log security event
    await logSecurityEvent(
      AuditAction.SECURITY_ALERT,
      severity,
      `Security alert: ${type} - ${message}`,
      undefined, // No user ID for system alerts
      request,
      undefined,
      {
        alertType: type,
        originalMessage: message,
        alertTimestamp: timestamp,
        ...metadata,
      }
    );
    
    // Send alert to monitoring system if critical
    if (severity === AuditSeverity.CRITICAL || severity === AuditSeverity.HIGH) {
      await InfrastructureMonitoring.sendSecurityAlert({
        title: `Security Alert: ${type}`,
        description: message,
        severity: severity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
        metadata: {
          timestamp,
          environment: process.env.NODE_ENV,
          ...metadata,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Security alert processed',
      alertId: `alert_${Date.now()}`,
    });
    
  } catch (error) {
    console.error('Security alert processing failed:', error);
    
    // Log the failure
    await logSecurityEvent(
      AuditAction.SYSTEM_ERROR,
      AuditSeverity.HIGH,
      'Security alert processing failed',
      undefined,
      request,
      error instanceof Error ? error.message : 'Unknown error',
      {
        originalRequest: await request.text().catch(() => 'Unable to read request'),
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to process security alert' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}
