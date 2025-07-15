'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, User, Calendar, CreditCard } from 'lucide-react';
// Removed LazyMotionDiv import - using regular divs for better performance

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/role');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);

          // Redirect based on role
          if (data.role === 'patient') {
            router.push('/dashboard/patient');
          } else if (data.role === 'doctor') {
            router.push('/dashboard/doctor');
          } else if (data.role === 'admin') {
            router.push('/dashboard/admin');
          }
        } else if (response.status === 404) {
          // User not found in database - redirect to onboarding
          console.log('User not found in database, redirecting to onboarding');
          router.push('/onboarding');
        } else {
          console.error('Failed to fetch user role:', response.status);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    if (isLoaded && user) {
      // Fetch user role and redirect to appropriate dashboard
      fetchUserRole();
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-gradient">
      {/* Header */}
      <header className="glass-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">MedMe</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.firstName}
            </span>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Welcome to your MedMe dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="animate-fade-in-delay-1">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Appointments
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No appointments yet
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-delay-2">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Available Credits
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">
                  Free starter credits
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-delay-3">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Account Status
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  Account verified
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="animate-fade-in-delay-4">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Next Appointment
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  No upcoming appointments
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-in-delay-5">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with your healthcare journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-auto p-6 flex flex-col items-center space-y-2">
                  <Calendar className="h-6 w-6" />
                  <span>Book Appointment</span>
                  <span className="text-xs opacity-75">Find and book with doctors</span>
                </Button>
                <Button variant="outline" className="h-auto p-6 flex flex-col items-center space-y-2">
                  <User className="h-6 w-6" />
                  <span>Complete Profile</span>
                  <span className="text-xs opacity-75">Add your medical information</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
