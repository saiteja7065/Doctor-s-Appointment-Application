'use client';

import { useEffect } from 'react';
import { initializeSecurity } from '@/lib/security-config';
import { InfrastructureSecurity } from '@/lib/infrastructure-security';

/**
 * Security Initializer Component
 * Validates security configuration and initializes security systems on app startup
 */
export function SecurityInitializer() {
  useEffect(() => {
    // Initialize security configuration
    const initSecurity = async () => {
      try {
        console.log('🔒 Initializing MedMe Security Systems...');
        
        // 1. Validate environment security configuration
        const securityValidation = initializeSecurity();
        
        if (securityValidation.errors.length > 0) {
          console.error('❌ Security Configuration Errors:');
          securityValidation.errors.forEach(error => {
            console.error(`  - ${error}`);
          });
          
          // In development, show warnings but continue
          // In production, this should halt the application
          if (process.env.NODE_ENV === 'production') {
            throw new Error('Critical security configuration errors detected');
          }
        }
        
        if (securityValidation.warnings.length > 0) {
          console.warn('⚠️ Security Configuration Warnings:');
          securityValidation.warnings.forEach(warning => {
            console.warn(`  - ${warning}`);
          });
        }
        
        // 2. Validate deployment environment
        const deploymentValidation = InfrastructureSecurity.validateDeployment();
        
        if (!deploymentValidation.isValid) {
          console.error('❌ Deployment Validation Failed:');
          deploymentValidation.errors.forEach(error => {
            console.error(`  - ${error}`);
          });
          
          if (process.env.NODE_ENV === 'production') {
            throw new Error('Deployment validation failed');
          }
        }
        
        // 3. Log security status
        console.log(`🔒 Security Score: ${securityValidation.score}/100`);
        console.log(`🏗️ Infrastructure Score: ${deploymentValidation.securityScore}/100`);
        console.log(`🌍 Environment: ${deploymentValidation.environment}`);
        
        // 4. Initialize security monitoring
        if (typeof window !== 'undefined') {
          // Client-side security initialization
          initializeClientSecurity();
        }
        
        // 5. Report security status
        const overallScore = Math.round((securityValidation.score + deploymentValidation.securityScore) / 2);
        
        if (overallScore >= 90) {
          console.log('✅ Security systems initialized successfully - Excellent security posture');
        } else if (overallScore >= 75) {
          console.log('✅ Security systems initialized - Good security posture');
        } else if (overallScore >= 60) {
          console.log('⚠️ Security systems initialized - Security improvements recommended');
        } else {
          console.log('❌ Security systems initialized - Critical security improvements required');
        }
        
      } catch (error) {
        console.error('❌ Security initialization failed:', error);
        
        // In production, this should trigger an alert
        if (process.env.NODE_ENV === 'production') {
          // Send alert to monitoring system
          try {
            await fetch('/api/security/alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'SECURITY_INIT_FAILURE',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              }),
            });
          } catch (alertError) {
            console.error('Failed to send security alert:', alertError);
          }
        }
      }
    };
    
    initSecurity();
  }, []);
  
  // This component doesn't render anything
  return null;
}

/**
 * Initialize client-side security features
 */
function initializeClientSecurity() {
  // 1. Disable right-click in production (optional)
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DISABLE_RIGHT_CLICK === 'true') {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  // 2. Disable F12 and other developer shortcuts in production (optional)
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DISABLE_DEV_TOOLS === 'true') {
    document.addEventListener('keydown', (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    });
  }
  
  // 3. Monitor for suspicious activity
  let suspiciousActivity = 0;
  
  // Monitor for rapid clicking (potential bot activity)
  let clickCount = 0;
  const clickWindow = 5000; // 5 seconds
  
  document.addEventListener('click', () => {
    clickCount++;
    
    setTimeout(() => {
      clickCount--;
    }, clickWindow);
    
    // If more than 20 clicks in 5 seconds, flag as suspicious
    if (clickCount > 20) {
      suspiciousActivity++;
      console.warn('Suspicious clicking activity detected');
      
      // Report to server
      fetch('/api/security/suspicious-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'RAPID_CLICKING',
          count: clickCount,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail - don't break user experience
      });
    }
  });
  
  // 4. Monitor for console access (potential developer tools usage)
  if (process.env.NODE_ENV === 'production') {
    let devtools = { open: false, orientation: null };
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
        if (!devtools.open) {
          devtools.open = true;
          console.warn('Developer tools detected');
          
          // Report to server
          fetch('/api/security/devtools-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'DEVTOOLS_OPENED',
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {
            // Silently fail
          });
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }
  
  // 5. Initialize Content Security Policy reporting
  if (typeof window.ReportingObserver !== 'undefined') {
    const observer = new ReportingObserver((reports) => {
      for (const report of reports) {
        if (report.type === 'csp-violation') {
          console.warn('CSP Violation:', report.body);
          
          // Report CSP violations to server
          fetch('/api/security/csp-violation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'CSP_VIOLATION',
              violation: report.body,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {
            // Silently fail
          });
        }
      }
    });
    
    observer.observe();
  }
  
  // 6. Monitor for tab visibility changes (potential security concern)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab became hidden - could be suspicious if user is in sensitive area
      const sensitivePages = ['/admin', '/payments', '/api'];
      const currentPath = window.location.pathname;
      
      if (sensitivePages.some(page => currentPath.includes(page))) {
        fetch('/api/security/tab-hidden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'SENSITIVE_TAB_HIDDEN',
            path: currentPath,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {
          // Silently fail
        });
      }
    }
  });
  
  // 7. Initialize session timeout warning
  let sessionWarningShown = false;
  const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours
  const warningTime = sessionTimeout - (15 * 60 * 1000); // 15 minutes before timeout
  
  setTimeout(() => {
    if (!sessionWarningShown) {
      sessionWarningShown = true;
      
      // Show session timeout warning
      if (window.confirm('Your session will expire in 15 minutes. Would you like to extend it?')) {
        // Refresh session
        fetch('/api/auth/refresh-session', {
          method: 'POST',
        }).catch(() => {
          console.warn('Failed to refresh session');
        });
      }
    }
  }, warningTime);
  
  console.log('🔒 Client-side security features initialized');
}

/**
 * Security status indicator (for development)
 */
export function SecurityStatusIndicator() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: '#000',
        color: '#0f0',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        opacity: 0.7,
      }}
    >
      🔒 Security: Active
    </div>
  );
}
