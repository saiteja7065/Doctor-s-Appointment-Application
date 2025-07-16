/**
 * Suspicious Activity Reporting API
 * Handles reports of suspicious user behavior
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/audit';
import { AuditAction, AuditSeverity } from '@/lib/models/AuditLog';
import { ThreatDetector } from '@/lib/security-monitoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, count, timestamp, metadata } = body;
    
    // Get client information
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               request.ip || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Analyze the suspicious activity
    let severity: AuditSeverity;
    let description: string;
    
    switch (type) {
      case 'RAPID_CLICKING':
        severity = count > 50 ? AuditSeverity.HIGH : AuditSeverity.MEDIUM;
        description = `Rapid clicking detected: ${count} clicks in short period`;
        break;
      case 'UNUSUAL_NAVIGATION':
        severity = AuditSeverity.MEDIUM;
        description = 'Unusual navigation pattern detected';
        break;
      case 'AUTOMATED_BEHAVIOR':
        severity = AuditSeverity.HIGH;
        description = 'Automated/bot-like behavior detected';
        break;
      default:
        severity = AuditSeverity.LOW;
        description = `Suspicious activity: ${type}`;
    }
    
    // Log the suspicious activity
    await logSecurityEvent(
      AuditAction.SUSPICIOUS_ACTIVITY,
      severity,
      description,
      undefined, // No user ID available from client-side reports
      request,
      undefined,
      {
        activityType: type,
        count,
        ip,
        userAgent,
        reportTimestamp: timestamp,
        ...metadata,
      }
    );
    
    // Check if this IP has multiple suspicious activities
    // In a real implementation, you'd query your database for recent activities
    const suspiciousScore = calculateSuspiciousScore(type, count);
    
    if (suspiciousScore > 75) {
      // High suspicion - consider blocking or additional monitoring
      await logSecurityEvent(
        AuditAction.SECURITY_INCIDENT,
        AuditSeverity.HIGH,
        `High suspicious activity score: ${suspiciousScore}`,
        undefined,
        request,
        undefined,
        {
          suspiciousScore,
          activityType: type,
          ip,
          recommendedAction: 'MONITOR_CLOSELY',
        }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Suspicious activity reported',
      suspiciousScore,
      action: suspiciousScore > 75 ? 'MONITOR' : 'LOG',
    });
    
  } catch (error) {
    console.error('Suspicious activity reporting failed:', error);
    
    return NextResponse.json(
      { error: 'Failed to report suspicious activity' },
      { status: 500 }
    );
  }
}

/**
 * Calculate suspicious activity score
 */
function calculateSuspiciousScore(type: string, count: number): number {
  let baseScore = 0;
  
  switch (type) {
    case 'RAPID_CLICKING':
      baseScore = Math.min(count * 2, 60); // Max 60 points for clicking
      break;
    case 'UNUSUAL_NAVIGATION':
      baseScore = 30;
      break;
    case 'AUTOMATED_BEHAVIOR':
      baseScore = 80;
      break;
    default:
      baseScore = 20;
  }
  
  return Math.min(baseScore, 100);
}
