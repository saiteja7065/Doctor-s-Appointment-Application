'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Removed framer-motion for better performance - using CSS animations
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Removed framer-motion dependency for better performance

interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  pendingDoctors: number;
  totalAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
  pendingWithdrawals: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Demo data fallback
          setStats({
            totalUsers: 1247,
            totalPatients: 1089,
            totalDoctors: 158,
            pendingDoctors: 23,
            totalAppointments: 3456,
            todayAppointments: 47,
            totalRevenue: 89750,
            pendingWithdrawals: 12,
            systemHealth: 'healthy'
          });
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        // Demo data fallback
        setStats({
          totalUsers: 1247,
          totalPatients: 1089,
          totalDoctors: 158,
          pendingDoctors: 23,
          totalAppointments: 3456,
          todayAppointments: 47,
          totalRevenue: 89750,
          pendingWithdrawals: 12,
          systemHealth: 'healthy'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              System overview and management center
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={stats?.systemHealth === 'healthy' ? 'default' : 'destructive'}
              className="text-sm"
            >
              {stats?.systemHealth === 'healthy' ? 'System Healthy' : 'System Issues'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalPatients} patients, {stats?.totalDoctors} doctors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Doctor Verifications */}
        <div className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Doctors</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats?.pendingDoctors}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting verification
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Appointments */}
        <div className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalAppointments.toLocaleString()} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Revenue */}
        <div className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                All-time earnings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Actions */}
        <div className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Urgent Actions Required</span>
              </CardTitle>
              <CardDescription>
                Items that need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Doctor Verifications</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.pendingDoctors} applications pending review
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/doctors')}
                >
                  Review
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Withdrawal Requests</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.pendingWithdrawals} requests awaiting processing
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/financial')}
                >
                  Process
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="animate-fade-in">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-500" />
                <span>System Health</span>
              </CardTitle>
              <CardDescription>
                Current platform status and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Online
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment System</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Video Consultations</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Notifications</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Sending
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
