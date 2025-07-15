'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Star,
  Clock,
  Video,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DoctorStats {
  totalAppointments: number;
  todayAppointments: number;
  totalPatients: number;
  totalEarnings: number;
  averageRating: number;
  totalRatings: number;
  verificationStatus: string;
}

export default function DoctorDashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<DoctorStats>({
    totalAppointments: 0,
    todayAppointments: 0,
    totalPatients: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalRatings: 0,
    verificationStatus: 'pending'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDoctorStats = async () => {
      try {
        const response = await fetch('/api/doctors/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalAppointments: data.stats.totalAppointments,
            todayAppointments: data.stats.todayAppointments,
            totalPatients: data.stats.totalPatients,
            totalEarnings: data.stats.totalEarnings,
            averageRating: data.stats.averageRating,
            totalRatings: data.stats.totalRatings,
            verificationStatus: data.stats.verificationStatus
          });
        } else {
          // Fallback to default stats if API fails
          setStats({
            totalAppointments: 0,
            todayAppointments: 0,
            totalPatients: 0,
            totalEarnings: 0,
            averageRating: 0,
            totalRatings: 0,
            verificationStatus: 'pending'
          });
        }
      } catch (error) {
        console.error('Error fetching doctor stats:', error);
        // Fallback to default stats on error
        setStats({
          totalAppointments: 0,
          todayAppointments: 0,
          totalPatients: 0,
          totalEarnings: 0,
          averageRating: 0,
          totalRatings: 0,
          verificationStatus: 'pending'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctorStats();
  }, []);

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.firstName?.startsWith('Dr.') ? user.firstName : `Dr. ${user?.firstName}`}
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your medical practice
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {getVerificationStatusBadge(stats.verificationStatus)}
          </div>
        </div>
      </div>

      {/* Verification Status Alert */}
      {stats.verificationStatus === 'pending' && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800">Account Under Review</h3>
                  <p className="text-amber-700 mt-1">
                    Your doctor application is currently being reviewed by our team. This process typically takes 2-5 business days. 
                    You'll receive an email notification once your account is verified.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                      View Application Status
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Appointments
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.todayAppointments} scheduled today
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                Unique patients served
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Earnings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEarnings} credits</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 mr-1" />
                Available for withdrawal
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Patient Rating
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalRatings > 0 ? `${stats.totalRatings} reviews` : 'No reviews yet'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your practice efficiently
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                className="h-auto p-6 flex flex-col items-center space-y-2"
                disabled={stats.verificationStatus !== 'approved'}
                onClick={() => window.location.href = '/dashboard/doctor/availability'}
              >
                <Clock className="h-6 w-6" />
                <span>Set Availability</span>
                <span className="text-xs opacity-75">Configure your schedule</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center space-y-2"
                disabled={stats.verificationStatus !== 'approved'}
                onClick={() => window.location.href = '/dashboard/doctor/appointments'}
              >
                <Video className="h-6 w-6" />
                <span>View Appointments</span>
                <span className="text-xs opacity-75">Manage consultations</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center space-y-2"
                onClick={() => window.location.href = '/dashboard/doctor/earnings'}
              >
                <DollarSign className="h-6 w-6" />
                <span>View Earnings</span>
                <span className="text-xs opacity-75">Track your income</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest appointments and interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Your appointments will appear here once you start practicing</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
