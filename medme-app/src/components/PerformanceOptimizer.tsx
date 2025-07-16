'use client';

import { useEffect } from 'react';
import { 
  initializePerformanceOptimizations, 
  optimizeFontLoading, 
  PerformanceMonitor,
  optimizeMemoryUsage 
} from '@/lib/performance';

/**
 * Performance Optimizer Component
 * Handles all performance optimizations and console warning suppressions
 */
export function PerformanceOptimizer() {
  useEffect(() => {
    // Initialize all performance optimizations
    initializePerformanceOptimizations();
    optimizeFontLoading();
    optimizeMemoryUsage();
    
    // Start performance monitoring
    const monitor = PerformanceMonitor.getInstance();
    monitor.measurePageLoad();
    
    // Suppress React DevTools warning in production
    if (process.env.NODE_ENV === 'production') {
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        const message = args.join(' ');
        
        // Suppress specific warnings
        if (
          message.includes('Download the React DevTools') ||
          message.includes('was preloaded using link preload but not used') ||
          message.includes('beforeinstallpromptevent.preventDefault()') ||
          message.includes('Service Worker')
        ) {
          return;
        }
        
        originalConsoleWarn.apply(console, args);
      };
    }
    
    // Optimize font loading with font-display: swap
    const fontOptimizationStyle = document.createElement('style');
    fontOptimizationStyle.textContent = `
      /* Optimize font loading performance */
      .font-geist-sans {
        font-display: swap;
      }
      .font-geist-mono {
        font-display: swap;
      }
      
      /* Reduce layout shift */
      * {
        font-feature-settings: "kern" 1, "liga" 1;
      }
      
      /* Optimize animations */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(fontOptimizationStyle);
    
    // Preload critical resources
    const criticalResources = [
      { href: '/api/users/role', as: 'fetch' },
      { href: '/api/notifications/check', as: 'fetch' },
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource.href;
      if (resource.as) {
        link.as = resource.as;
      }
      document.head.appendChild(link);
    });
    
    // Optimize images with lazy loading
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy';
      }
    });
    
    // Add performance observer for monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (process.env.NODE_ENV === 'development') {
            if (entry.entryType === 'largest-contentful-paint') {
              console.log(`🎯 LCP: ${entry.startTime.toFixed(2)}ms`);
            }
            if (entry.entryType === 'first-input') {
              console.log(`⚡ FID: ${entry.processingStart - entry.startTime}ms`);
            }
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      } catch (e) {
        // Fallback for browsers that don't support these metrics
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance Observer not fully supported');
        }
      }
    }
    
    // Cleanup function
    return () => {
      if (fontOptimizationStyle.parentNode) {
        fontOptimizationStyle.parentNode.removeChild(fontOptimizationStyle);
      }
    };
  }, []);
  
  // This component doesn't render anything
  return null;
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    
    // Monitor component mount time
    monitor.startTiming('component-mount');
    
    return () => {
      monitor.endTiming('component-mount');
    };
  }, []);
}

/**
 * Higher-order component for performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    const monitor = PerformanceMonitor.getInstance();
    
    useEffect(() => {
      monitor.startTiming(`${componentName}-render`);
      
      return () => {
        monitor.endTiming(`${componentName}-render`);
      };
    }, [monitor]);
    
    return <Component {...props} />;
  };
}

/**
 * Performance-optimized image component
 */
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
}

export function OptimizedImage({ 
  src, 
  alt, 
  priority = false, 
  className = '', 
  ...props 
}: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${className} transition-opacity duration-300`}
      style={{ 
        contentVisibility: 'auto',
        containIntrinsicSize: '300px 200px' 
      }}
      {...props}
    />
  );
}

/**
 * Performance-optimized video component
 */
interface OptimizedVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
}

export function OptimizedVideo({ 
  src, 
  poster, 
  className = '', 
  ...props 
}: OptimizedVideoProps) {
  return (
    <video
      src={src}
      poster={poster}
      loading="lazy"
      preload="metadata"
      className={`${className} transition-opacity duration-300`}
      style={{ 
        contentVisibility: 'auto',
        containIntrinsicSize: '640px 360px' 
      }}
      {...props}
    />
  );
}
