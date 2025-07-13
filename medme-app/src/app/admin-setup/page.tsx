'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminSetupPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    canCreateAdmin: boolean;
    currentUser: any;
    message: string;
  } | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/create-admin');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const createAdmin = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Admin created:', data);
        
        // Redirect to admin dashboard
        router.push('/dashboard/admin');
      } else {
        const error = await response.json();
        console.error('Error creating admin:', error);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDemoData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/demo-data', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Demo data created:', data);
        alert(`Created ${data.created} demo doctor applications!`);
      } else {
        const error = await response.json();
        console.error('Error creating demo data:', error);
        alert('Error creating demo data. Check console for details.');
      }
    } catch (error) {
      console.error('Error creating demo data:', error);
      alert('Error creating demo data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access admin setup
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <Card className="glass-card">
          <CardHeader className="text-center">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-3xl">MedMe Admin Setup</CardTitle>
            <CardDescription className="text-lg">
              Set up administrative access for the MedMe platform
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Current User Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Current User Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Email:</span>
              <span className="font-medium">{user.emailAddresses[0]?.emailAddress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Name:</span>
              <span className="font-medium">{user.firstName} {user.lastName}</span>
            </div>
            {status && (
              <>
                <div className="flex items-center justify-between">
                  <span>Current Role:</span>
                  <Badge variant={status.currentUser?.isAdmin ? "default" : "secondary"}>
                    {status.currentUser?.role || 'No Profile'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {status.message}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>
              Set up your admin account and create demo data for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.currentUser?.isAdmin ? (
              <div className="space-y-4">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>You already have admin access!</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => router.push('/dashboard/admin')}
                    className="w-full"
                  >
                    Go to Admin Dashboard
                  </Button>
                  <Button 
                    onClick={createDemoData}
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? 'Creating...' : 'Create Demo Data'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={createAdmin}
                  disabled={loading || !status?.canCreateAdmin}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
                </Button>
                {!status?.canCreateAdmin && (
                  <div className="text-sm text-amber-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Database connection required to create admin account
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create your admin account using the button above</li>
              <li>Access the admin dashboard to manage the platform</li>
              <li>Create demo doctor applications for testing verification</li>
              <li>Test the doctor verification workflow</li>
              <li>Review user management and platform statistics</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
