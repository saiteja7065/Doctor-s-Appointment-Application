/**
 * Performance optimization utilities for MedMe application
 * Handles console warnings, development tools, and production optimizations
 */

import React from 'react';

/**
 * Suppress development warnings in production
 */
export function suppressDevelopmentWarnings() {
  if (process.env.NODE_ENV === 'production') {
    // Suppress React DevTools warning
    if (typeof window !== 'undefined') {
      // Override console methods for specific warnings
      const originalWarn = console.warn;
      const originalLog = console.log;
      
      console.warn = (...args) => {
        const message = args.join(' ');
        
        // Suppress React DevTools warning
        if (message.includes('Download the React DevTools')) {
          return;
        }
        
        // Suppress font preload warnings in production
        if (message.includes('was preloaded using link preload but not used')) {
          return;
        }
        
        // Suppress service worker warnings
        if (message.includes('Service Worker')) {
          return;
        }
        
        originalWarn.apply(console, args);
      };
      
      console.log = (...args) => {
        const message = args.join(' ');
        
        // Suppress PWA installation logs in production
        if (message.includes('PWA was installed') || 
            message.includes('Service Worker registered') ||
            message.includes('User accepted the install prompt')) {
          return;
        }
        
        originalLog.apply(console, args);
      };
    }
  }
}

/**
 * Initialize performance optimizations
 */
export function initializePerformanceOptimizations() {
  suppressDevelopmentWarnings();
  
  // Preload critical resources
  if (typeof window !== 'undefined') {
    // Preload critical API endpoints
    const criticalEndpoints = [
      '/api/users/role',
      '/api/notifications/check'
    ];
    
    criticalEndpoints.forEach(endpoint => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = endpoint;
      document.head.appendChild(link);
    });
  }
}

/**
 * Optimize font loading
 */
export function optimizeFontLoading() {
  if (typeof window !== 'undefined') {
    // Add font-display: swap to improve loading performance
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Geist';
        font-display: swap;
      }
      @font-face {
        font-family: 'Geist Mono';
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startTiming(label: string): void {
    this.metrics.set(label, performance.now());
  }
  
  endTiming(label: string): number {
    const startTime = this.metrics.get(label);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.metrics.delete(label);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  measurePageLoad(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Page Load Metrics:', {
            'DNS Lookup': `${navigation.domainLookupEnd - navigation.domainLookupStart}ms`,
            'TCP Connection': `${navigation.connectEnd - navigation.connectStart}ms`,
            'Request/Response': `${navigation.responseEnd - navigation.requestStart}ms`,
            'DOM Processing': `${navigation.domContentLoadedEventEnd - navigation.responseEnd}ms`,
            'Total Load Time': `${navigation.loadEventEnd - navigation.navigationStart}ms`
          });
        }
      });
    }
  }
}

/**
 * Lazy loading utilities
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFunc);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return React.createElement(
      React.Suspense,
      {
        fallback: fallback
          ? React.createElement(fallback)
          : React.createElement('div', null, 'Loading...')
      },
      React.createElement(LazyComponent, props)
    );
  };
}

/**
 * Memory optimization utilities
 */
export function optimizeMemoryUsage() {
  if (typeof window !== 'undefined') {
    // Clean up unused event listeners
    const cleanupInterval = setInterval(() => {
      // Force garbage collection in development
      if (process.env.NODE_ENV === 'development' && 'gc' in window) {
        (window as any).gc();
      }
    }, 60000); // Every minute
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(cleanupInterval);
    });
  }
}


