'use client';

import { useEffect } from 'react';

/**
 * Validate client-side environment variables
 */
function validateClientEnvironment() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required client-side environment variables
  const requiredClientVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];

  for (const envVar of requiredClientVars) {
    const value = process.env[envVar];
    if (!value || value === 'undefined' || value === '') {
      errors.push(`Missing required client environment variable: ${envVar}`);
    }
  }

  // Check for development keys in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.includes('test')) {
      warnings.push('Using test Clerk keys in production');
    }

    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      warnings.push('Using localhost URL in production');
    }
  }

  return { errors, warnings };
}

/**
 * Initialize client-side security features
 */
function initializeClientSecurity() {
  if (typeof window === 'undefined') return;

  // 1. Set up Content Security Policy reporting
  if ('securitypolicyviolation' in window) {
    window.addEventListener('securitypolicyviolation', (event) => {
      console.warn('CSP Violation:', {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
      });

      // Report to server in production
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/security/csp-violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockedURI: event.blockedURI,
            violatedDirective: event.violatedDirective,
            timestamp: new Date().toISOString(),
          }),
        }).catch(console.error);
      }
    });
  }

  // 2. Monitor for suspicious activity
  let suspiciousActivityCount = 0;
  const maxSuspiciousActivity = 10;

  // Monitor for rapid form submissions
  document.addEventListener('submit', () => {
    suspiciousActivityCount++;
    if (suspiciousActivityCount > maxSuspiciousActivity) {
      console.warn('Suspicious activity detected: Rapid form submissions');

      if (process.env.NODE_ENV === 'production') {
        fetch('/api/security/suspicious-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'RAPID_FORM_SUBMISSION',
            count: suspiciousActivityCount,
            timestamp: new Date().toISOString(),
          }),
        }).catch(console.error);
      }
    }
  });

  // Reset counter every minute
  setInterval(() => {
    suspiciousActivityCount = 0;
  }, 60000);

  // 3. Disable right-click in production (optional)
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  console.log('🔒 Client-side security features initialized');
}

/**
 * Security Initializer Component
 * Validates client-side security configuration and initializes security systems on app startup
 */
export function SecurityInitializer() {
  useEffect(() => {
    // Initialize client-side security configuration
    const initSecurity = async () => {
      try {
        console.log('🔒 Initializing MedMe Client Security Systems...');

        // 1. Validate client-side environment variables
        const clientValidation = validateClientEnvironment();

        if (clientValidation.errors.length > 0) {
          // In development, show as warnings instead of errors
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Client Security Configuration Issues (Development Mode):');
            clientValidation.errors.forEach(error => {
              console.warn(`  - ${error}`);
            });
            console.warn('⚠️ These will be critical errors in production');
          } else {
            // In production, show as errors and halt
            console.error('❌ Client Security Configuration Errors:');
            clientValidation.errors.forEach(error => {
              console.error(`  - ${error}`);
            });
            throw new Error('Critical client security configuration errors detected');
          }
        }

        if (clientValidation.warnings.length > 0) {
          console.warn('⚠️ Client Security Configuration Warnings:');
          clientValidation.warnings.forEach(warning => {
            console.warn(`  - ${warning}`);
          });
        }

        // 2. Initialize client-side security features
        initializeClientSecurity();

        console.log('✅ Client security systems initialized successfully');

      } catch (error) {
        console.error('❌ Client security initialization failed:', error);

        // In production, this should trigger an alert
        if (process.env.NODE_ENV === 'production') {
          // Send alert to monitoring system
          try {
            await fetch('/api/security/alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'CLIENT_SECURITY_INIT_FAILURE',
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
