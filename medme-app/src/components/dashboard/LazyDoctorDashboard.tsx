'use client';

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, DollarSign, Star } from 'lucide-react';

// Lazy load the heavy dashboard component
const DoctorDashboardContent = lazy(() => 
  import('@/app/dashboard/doctor/page').then(mod => ({ default: mod.default }))
);

// Lightweight loading skeleton
const DashboardSkeleton = () => (
  <div className="container mx-auto p-6 space-y-8">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className="w-48 h-8 bg-muted rounded animate-pulse"></div>
      <div className="w-64 h-4 bg-muted rounded animate-pulse"></div>
    </div>

    {/* Stats grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { icon: Calendar, title: 'Total Appointments' },
        { icon: Users, title: 'Total Patients' },
        { icon: DollarSign, title: 'Total Earnings' },
        { icon: Star, title: 'Average Rating' }
      ].map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="glass-card animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="w-16 h-8 bg-muted rounded animate-pulse mb-2"></div>
              <div className="w-24 h-3 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Verification status skeleton */}
    <Card className="glass-card animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
          <div className="w-32 h-5 bg-muted rounded animate-pulse"></div>
        </CardTitle>
        <CardDescription>
          <div className="w-48 h-4 bg-muted rounded animate-pulse"></div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="w-full h-4 bg-muted rounded animate-pulse"></div>
          <div className="w-3/4 h-4 bg-muted rounded animate-pulse"></div>
          <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>

    {/* Recent activity skeleton */}
    <Card className="glass-card animate-fade-in">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          <div className="w-48 h-4 bg-muted rounded animate-pulse"></div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-4 animate-pulse"></div>
          <div className="w-32 h-4 bg-muted rounded mx-auto mb-2 animate-pulse"></div>
          <div className="w-48 h-3 bg-muted rounded mx-auto animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function LazyDoctorDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DoctorDashboardContent />
    </Suspense>
  );
}
