'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Stethoscope, Shield, CheckCircle } from 'lucide-react';

interface UserRoleData {
  role?: UserRole;
  status?: string;
  hasRole: boolean;
  loading: boolean;
  error?: string;
}

interface RoleSelectionGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowRoleSelection?: boolean;
}

/**
 * Component that ensures users have selected a role before accessing the application
 * Enforces immutable role selection - once chosen, roles cannot be changed
 */
export function RoleSelectionGuard({ 
  children, 
  requiredRole,
  allowRoleSelection = true 
}: RoleSelectionGuardProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [userRoleData, setUserRoleData] = useState<UserRoleData>({
    hasRole: false,
    loading: true,
  });
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    async function checkUserRole() {
      if (!isLoaded || !user) {
        setUserRoleData(prev => ({ ...prev, loading: false, error: 'User not authenticated' }));
        return;
      }

      try {
        const response = await fetch('/api/users/role');
        if (response.ok) {
          // Handle successful response safely
          let data = { role: 'patient', status: 'active' };
          try {
            const responseText = await response.text();
            if (responseText) {
              data = JSON.parse(responseText);
            }
          } catch (parseError) {
            console.warn('Warning: Could not parse role response JSON, using defaults');
          }

          setUserRoleData({
            role: data.role,
            status: data.status,
            hasRole: true,
            loading: false,
          });
        } else if (response.status === 404) {
          // User not found in database - needs to select role
          setUserRoleData({
            hasRole: false,
            loading: false,
          });
        } else {
          setUserRoleData(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to fetch user role'
          }));
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRoleData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Error fetching user role' 
        }));
      }
    }

    checkUserRole();
  }, [user, isLoaded]);

  const handleRoleSelection = async (selectedRole: UserRole) => {
    if (!user) return;

    setIsSelecting(true);
    try {
      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.emailAddresses[0]?.emailAddress,
        }),
      });

      if (response.ok) {
        // Handle successful response safely
        let data = { status: 'active' };
        try {
          const responseText = await response.text();
          if (responseText) {
            data = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.warn('Warning: Could not parse response JSON, using defaults');
        }

        setUserRoleData({
          role: selectedRole,
          status: data.status,
          hasRole: true,
          loading: false,
        });

        // Redirect based on role
        switch (selectedRole) {
          case UserRole.PATIENT:
            router.push('/patient/profile');
            break;
          case UserRole.DOCTOR:
            router.push('/doctor/apply');
            break;
          case UserRole.ADMIN:
            router.push('/admin/dashboard');
            break;
          default:
            router.push('/dashboard');
        }
      } else {
        // Handle error response safely
        let errorMessage = 'Failed to set user role';
        let errorData: any = {};

        try {
          const errorText = await response.text();
          if (errorText) {
            errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || 'Failed to set user role';
          }
        } catch (parseError) {
          errorMessage = `Server error (${response.status})`;
        }

        // Handle specific error cases
        if (response.status === 409 && (errorMessage.includes('already exists') || errorMessage.includes('User already exists'))) {
          // User already exists - redirect them based on their existing role
          console.log('ℹ️ User already exists, redirecting to appropriate dashboard...');

          if (errorData.currentRole) {
            // Use the existing role from the error response
            setUserRoleData({
              role: errorData.currentRole,
              status: errorData.currentStatus || 'active',
              hasRole: true,
              loading: false,
            });

            // Redirect based on existing role
            switch (errorData.currentRole) {
              case UserRole.PATIENT:
                router.push('/patient/profile');
                break;
              case UserRole.DOCTOR:
                router.push('/doctor/dashboard');
                break;
              case UserRole.ADMIN:
                router.push('/admin/dashboard');
                break;
              default:
                router.push('/dashboard');
            }
          } else {
            // Fallback: refresh to trigger role check
            window.location.reload();
          }
        } else {
          // Other errors
          setUserRoleData(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
          }));
        }
      }
    } catch (error) {
      console.error('Error setting user role:', error);
      setUserRoleData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Error setting user role' 
      }));
    } finally {
      setIsSelecting(false);
    }
  };

  // Show loading state
  if (!isLoaded || userRoleData.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (userRoleData.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{userRoleData.error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show role selection if user doesn't have a role
  if (!userRoleData.hasRole && allowRoleSelection) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-4xl p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to MedMe
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Please select your role to get started
            </p>
            <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-2xl mx-auto">
              <AlertTriangle className="mr-2 h-4 w-4" />
              <strong>Important:</strong> Your role cannot be changed after selection. 
              Choose carefully based on how you plan to use the platform.
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Patient Role */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">I'm a Patient</CardTitle>
                <CardDescription>
                  Book appointments, manage medical history, and consult with doctors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Book video consultations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Manage medical history
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Track appointments
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Secure messaging with doctors
                  </li>
                </ul>
                <Button 
                  onClick={() => handleRoleSelection(UserRole.PATIENT)}
                  disabled={isSelecting}
                  className="w-full"
                >
                  {isSelecting ? 'Setting up...' : 'Continue as Patient'}
                </Button>
              </CardContent>
            </Card>

            {/* Doctor Role */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-300">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                  <Stethoscope className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">I'm a Doctor</CardTitle>
                <CardDescription>
                  Provide consultations, manage patients, and earn from your expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Conduct video consultations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Manage availability
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Track earnings
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Patient management tools
                  </li>
                </ul>
                <div className="mb-4">
                  <Badge variant="outline" className="text-xs">
                    Requires verification
                  </Badge>
                </div>
                <Button 
                  onClick={() => handleRoleSelection(UserRole.DOCTOR)}
                  disabled={isSelecting}
                  variant="outline"
                  className="w-full border-green-300 hover:bg-green-50"
                >
                  {isSelecting ? 'Setting up...' : 'Continue as Doctor'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Need help choosing? <a href="/help" className="text-blue-600 hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has required role (if specified)
  if (requiredRole && userRoleData.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <Shield className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This page requires {requiredRole} role access. 
              Your current role is {userRoleData.role}.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Roles cannot be changed after selection. 
                You would need to create a separate account for a different role.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has proper role, render children
  return <>{children}</>;
}
