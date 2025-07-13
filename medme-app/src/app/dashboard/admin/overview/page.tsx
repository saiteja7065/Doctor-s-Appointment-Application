'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  UserCheck,
  DollarSign,
  Calendar,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Settings,
  BarChart3
} from 'lucide-react';

interface AdminOverviewData {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    userGrowthRate: number;
  };
  doctorStats: {
    totalDoctors: number;
    verifiedDoctors: number;
    pendingVerification: number;
    rejectedApplications: number;
  };
  financialStats: {
    totalRevenue: number;
    monthlyRevenue: number;
    pendingWithdrawals: number;
    totalWithdrawals: number;
  };
  appointmentStats: {
    totalAppointments: number;
    completedToday: number;
    upcomingToday: number;
    cancellationRate: number;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  recentActivities: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  alerts: {
    id: string;
    title: string;
    description: string;
    type: 'urgent' | 'warning' | 'info';
    timestamp: string;
  }[];
}

export default function AdminOverviewPage() {
  const { user, isLoaded } = useUser();
  const [overviewData, setOverviewData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverviewData = async () => {
    try {
      const response = await fetch('/api/admin/overview');
      const data = await response.json();

      if (response.ok) {
        setOverviewData(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load overview data');
      }
    } catch (error) {
      console.error('Error loading overview data:', error);
      setError('Failed to load overview data');
      // Set demo data for development
      setOverviewData({
        userStats: {
          totalUsers: 1247,
          activeUsers: 1156,
          newUsersToday: 23,
          userGrowthRate: 12.5
        },
        doctorStats: {
          totalDoctors: 89,
          verifiedDoctors: 76,
          pendingVerification: 8,
          rejectedApplications: 5
        },
        financialStats: {
          totalRevenue: 45670.00,
          monthlyRevenue: 8920.00,
          pendingWithdrawals: 2340.00,
          totalWithdrawals: 12450.00
        },
        appointmentStats: {
          totalAppointments: 3456,
          completedToday: 45,
          upcomingToday: 67,
          cancellationRate: 8.2
        },
        systemHealth: {
          status: 'healthy',
          uptime: 99.8,
          responseTime: 245,
          errorRate: 0.02
        },
        recentActivities: [
          {
            id: '1',
            type: 'doctor_verification',
            description: 'Dr. Sarah Johnson verified and approved',
            timestamp: new Date().toISOString(),
            severity: 'info'
          },
          {
            id: '2',
            type: 'withdrawal_request',
            description: 'Withdrawal request of $150 from Dr. Mike Chen',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            severity: 'warning'
          },
          {
            id: '3',
            type: 'system_alert',
            description: 'High server load detected - auto-scaling triggered',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            severity: 'warning'
          }
        ],
        alerts: [
          {
            id: '1',
            title: 'Pending Doctor Verifications',
            description: '8 doctor applications require immediate review',
            type: 'urgent',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            title: 'High Withdrawal Volume',
            description: 'Unusual increase in withdrawal requests today',
            type: 'warning',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadOverviewData();
    }
  }, [isLoaded, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOverviewData();
    setIsRefreshing(false);
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'doctor_verification':
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case 'withdrawal_request':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Overview</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive platform analytics and system health monitoring
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge 
            variant={overviewData?.systemHealth.status === 'healthy' ? 'default' : 'destructive'}
            className="text-sm"
          >
            System {overviewData?.systemHealth.status || 'Unknown'}
          </Badge>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData?.userStats.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +{overviewData?.userStats.userGrowthRate || 0}% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Doctors</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData?.doctorStats.verifiedDoctors || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewData?.doctorStats.pendingVerification || 0} pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(overviewData?.financialStats.monthlyRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${(overviewData?.financialStats.totalRevenue || 0).toFixed(2)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewData?.appointmentStats.upcomingToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewData?.appointmentStats.completedToday || 0} completed today
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health and Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Real-time system performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uptime</span>
                <span className="font-medium">{overviewData?.systemHealth.uptime || 0}%</span>
              </div>
              <Progress value={overviewData?.systemHealth.uptime || 0} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {overviewData?.systemHealth.responseTime || 0}ms
                </div>
                <div className="text-xs text-muted-foreground">Response Time</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {overviewData?.systemHealth.errorRate || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Error Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>
              Issues requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overviewData?.alerts.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                </div>
              ) : (
                overviewData?.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest system activities and administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overviewData?.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={activity.severity === 'error' ? 'destructive' : 'secondary'}>
                    {activity.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                <a href="/dashboard/admin/doctors">
                  <Shield className="h-6 w-6" />
                  <span className="text-sm">Review Doctors</span>
                </a>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                <a href="/dashboard/admin/withdrawals">
                  <DollarSign className="h-6 w-6" />
                  <span className="text-sm">Process Withdrawals</span>
                </a>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                <a href="/dashboard/admin/users">
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Manage Users</span>
                </a>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2" asChild>
                <a href="/dashboard/admin/financial">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Financial Reports</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
