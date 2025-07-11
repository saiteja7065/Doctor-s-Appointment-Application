'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditBalance } from '@/components/ui/credit-balance';
import {
  Calendar,
  CreditCard,
  User,
  Heart,
  Clock,
  Stethoscope,
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface PatientStats {
  creditBalance: number;
  totalAppointments: number;
  upcomingAppointments: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

export default function PatientDashboardPage() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<PatientStats>({
    creditBalance: 2,
    totalAppointments: 0,
    upcomingAppointments: 0,
    subscriptionPlan: 'free',
    subscriptionStatus: 'inactive',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatientStats = async () => {
      try {
        const response = await fetch(`/api/patients/profile/${user?.id}`);
        if (response.ok) {
          const data = await response.json();
          setStats({
            creditBalance: data.creditBalance || 2,
            totalAppointments: data.totalAppointments || 0,
            upcomingAppointments: 0, // TODO: Calculate from appointments
            subscriptionPlan: data.subscriptionPlan || 'free',
            subscriptionStatus: data.subscriptionStatus || 'inactive',
          });
        }
      } catch (error) {
        console.error('Error loading patient stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      loadPatientStats();
    }
  }, [isLoaded, user]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Book Appointment',
      description: 'Find and book with qualified doctors',
      icon: Calendar,
      href: '/dashboard/patient/doctors',
      color: 'bg-primary',
    },
    {
      title: 'Update Profile',
      description: 'Manage your personal information',
      icon: User,
      href: '/dashboard/patient/profile',
      color: 'bg-accent',
    },
    {
      title: 'View Appointments',
      description: 'Check your upcoming consultations',
      icon: Clock,
      href: '/dashboard/patient/appointments',
      color: 'bg-secondary',
    },
    {
      title: 'Manage Subscription',
      description: 'Upgrade your plan for more credits',
      icon: CreditCard,
      href: '/dashboard/patient/subscription',
      color: 'bg-muted',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-xl text-muted-foreground">
          Ready for your next healthcare consultation?
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CreditBalance
            showDetails={false}
            showPurchaseButton={false}
            className="h-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
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
                Consultations completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingAppointments}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled appointments
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Plan Status
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{stats.subscriptionPlan}</div>
              <p className="text-xs text-muted-foreground">
                {stats.subscriptionStatus === 'active' ? 'Active subscription' : 'No active plan'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Credit Management Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-1">
          <CreditBalance showDetails={true} showPurchaseButton={true} />
        </div>
        <div className="lg:col-span-2">
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle>Credit Usage Tips</CardTitle>
              <CardDescription>
                Make the most of your consultation credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">💡 Smart Booking</h4>
                  <p className="text-sm text-muted-foreground">
                    Each consultation costs 2 credits. Plan your appointments to make the most of your credits.
                  </p>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg">
                  <h4 className="font-medium text-secondary-foreground mb-2">🎁 Free Credits</h4>
                  <p className="text-sm text-muted-foreground">
                    New patients receive 2 free credits to get started with their first consultation.
                  </p>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <h4 className="font-medium text-accent-foreground mb-2">📅 No Expiry</h4>
                  <p className="text-sm text-muted-foreground">
                    Your credits never expire. Use them whenever you need medical consultation.
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">💳 Easy Top-up</h4>
                  <p className="text-sm text-muted-foreground">
                    Purchase additional credits anytime through our secure payment system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Everything you need to manage your healthcare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                  >
                    <Link href={action.href}>
                      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-lg ${action.color}`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {action.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {action.description}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest healthcare interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No recent activity
              </h3>
              <p className="text-muted-foreground mb-4">
                Start your healthcare journey by booking your first appointment
              </p>
              <Link href="/dashboard/patient/doctors">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Book First Appointment
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
