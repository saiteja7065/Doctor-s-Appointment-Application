'use client';

import { lazy, Suspense } from 'react';

// Lazy load the heavy navigation component
const DoctorNavigation = lazy(() => import('./DoctorNavigation'));

// Lightweight loading fallback
const NavigationSkeleton = () => (
  <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border lg:block hidden">
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
          <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Navigation items skeleton */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
              <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
              <div className="w-24 h-4 bg-muted rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* User section skeleton */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
          <div className="w-16 h-4 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

// Mobile navigation skeleton
const MobileNavigationSkeleton = () => (
  <div className="lg:hidden">
    <div className="flex items-center justify-between p-4 border-b border-border bg-background">
      <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
      <div className="w-20 h-6 bg-muted rounded animate-pulse"></div>
      <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
    </div>
  </div>
);

export default function LazyDoctorNavigation() {
  return (
    <Suspense 
      fallback={
        <>
          <NavigationSkeleton />
          <MobileNavigationSkeleton />
        </>
      }
    >
      <DoctorNavigation />
    </Suspense>
  );
}
