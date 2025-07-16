/**
 * Content Security Policy Violation Reporting API
 * Handles CSP violation reports for security monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/audit';
import { AuditAction, AuditSeverity } from '@/lib/models/AuditLog';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, violation, timestamp } = body;
    
    // Validate CSP violation report
    if (!violation || typeof violation !== 'object') {
      return NextResponse.json(
        { error: 'Invalid CSP violation report' },
        { status: 400 }
      );
    }
    
    // Extract violation details
    const {
      blockedURI,
      violatedDirective,
      originalPolicy,
      sourceFile,
      lineNumber,
      columnNumber,
    } = violation;
    
    // Determine severity based on violation type
    let severity: AuditSeverity;
    if (violatedDirective?.includes('script-src') || violatedDirective?.includes('object-src')) {
      severity = AuditSeverity.HIGH; // Script violations are high risk
    } else if (violatedDirective?.includes('img-src') || violatedDirective?.includes('style-src')) {
      severity = AuditSeverity.MEDIUM; // Resource violations are medium risk
    } else {
      severity = AuditSeverity.LOW; // Other violations are low risk
    }
    
    // Check if this is a known false positive
    const isKnownFalsePositive = checkKnownFalsePositives(blockedURI, violatedDirective);
    
    if (isKnownFalsePositive) {
      severity = AuditSeverity.LOW;
    }
    
    // Log the CSP violation
    await logSecurityEvent(
      AuditAction.CSP_VIOLATION,
      severity,
      `CSP violation: ${violatedDirective} blocked ${blockedURI}`,
      undefined, // No user ID for CSP violations
      request,
      undefined,
      {
        violationType: type,
        blockedURI,
        violatedDirective,
        originalPolicy,
        sourceFile,
        lineNumber,
        columnNumber,
        reportTimestamp: timestamp,
        isKnownFalsePositive,
      }
    );
    
    // If this is a high-severity violation, check for patterns
    if (severity === AuditSeverity.HIGH && !isKnownFalsePositive) {
      await analyzeViolationPattern(request, violation);
    }
    
    return NextResponse.json({
      success: true,
      message: 'CSP violation reported',
      severity: severity.toLowerCase(),
      action: isKnownFalsePositive ? 'IGNORED' : 'LOGGED',
    });
    
  } catch (error) {
    console.error('CSP violation reporting failed:', error);
    
    return NextResponse.json(
      { error: 'Failed to report CSP violation' },
      { status: 500 }
    );
  }
}

/**
 * Check if CSP violation is a known false positive
 */
function checkKnownFalsePositives(blockedURI: string, violatedDirective: string): boolean {
  const knownFalsePositives = [
    // Browser extensions
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    
    // Common browser injected scripts
    'data:text/javascript',
    'about:blank',
    
    // Ad blockers and privacy tools
    'ublock-origin',
    'adblock',
    'ghostery',
    
    // Development tools
    'webpack-internal://',
    'eval',
  ];
  
  return knownFalsePositives.some(pattern => 
    blockedURI?.includes(pattern) || violatedDirective?.includes(pattern)
  );
}

/**
 * Analyze CSP violation patterns for potential attacks
 */
async function analyzeViolationPattern(request: NextRequest, violation: any) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown';
  
  // Check for XSS attempt patterns
  const xssPatterns = [
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<script/i,
    /eval\(/i,
  ];
  
  const isXSSAttempt = xssPatterns.some(pattern => 
    pattern.test(violation.blockedURI || '') || 
    pattern.test(violation.sourceFile || '')
  );
  
  if (isXSSAttempt) {
    await logSecurityEvent(
      AuditAction.SECURITY_INCIDENT,
      AuditSeverity.CRITICAL,
      'Potential XSS attempt detected via CSP violation',
      undefined,
      request,
      undefined,
      {
        incidentType: 'XSS_ATTEMPT',
        blockedURI: violation.blockedURI,
        violatedDirective: violation.violatedDirective,
        sourceFile: violation.sourceFile,
        ip,
        detectionMethod: 'CSP_VIOLATION_ANALYSIS',
      }
    );
  }
  
  // Check for injection attempt patterns
  const injectionPatterns = [
    /\bselect\b.*\bfrom\b/i,
    /\bunion\b.*\bselect\b/i,
    /\bdrop\b.*\btable\b/i,
    /\binsert\b.*\binto\b/i,
  ];
  
  const isInjectionAttempt = injectionPatterns.some(pattern => 
    pattern.test(violation.blockedURI || '')
  );
  
  if (isInjectionAttempt) {
    await logSecurityEvent(
      AuditAction.SECURITY_INCIDENT,
      AuditSeverity.HIGH,
      'Potential SQL injection attempt detected via CSP violation',
      undefined,
      request,
      undefined,
      {
        incidentType: 'SQL_INJECTION_ATTEMPT',
        blockedURI: violation.blockedURI,
        ip,
        detectionMethod: 'CSP_VIOLATION_ANALYSIS',
      }
    );
  }
}
