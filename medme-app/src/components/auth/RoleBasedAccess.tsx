'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/types/user';

interface RoleBasedAccessProps {
  allowedRoles: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireActiveStatus?: boolean;
}

interface UserRoleData {
  role: UserRole;
  status: string;
  loading: boolean;
  error?: string;
}

/**
 * Component that conditionally renders content based on user role
 * Enforces role-based access control at the UI level
 */
export function RoleBasedAccess({ 
  allowedRoles, 
  children, 
  fallback = null,
  requireActiveStatus = true 
}: RoleBasedAccessProps) {
  const { user, isLoaded } = useUser();
  const [userRoleData, setUserRoleData] = useState<UserRoleData>({
    role: UserRole.PATIENT,
    status: 'loading',
    loading: true,
  });

  useEffect(() => {
    async function fetchUserRole() {
      if (!isLoaded || !user) {
        setUserRoleData(prev => ({ ...prev, loading: false, error: 'User not authenticated' }));
        return;
      }

      try {
        const response = await fetch('/api/users/role');
        if (response.ok) {
          const data = await response.json();
          setUserRoleData({
            role: data.role,
            status: data.status,
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

    fetchUserRole();
  }, [user, isLoaded]);

  // Show loading state
  if (!isLoaded || userRoleData.loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  // Show error state
  if (userRoleData.error) {
    return fallback || <div className="text-red-500">Access denied: {userRoleData.error}</div>;
  }

  // Check if user status is active (if required)
  if (requireActiveStatus && userRoleData.status !== 'active') {
    return fallback || (
      <div className="text-yellow-600">
        Account is not active. Please contact support or complete verification.
      </div>
    );
  }

  // Check role-based access
  const hasAccess = Array.isArray(allowedRoles) 
    ? allowedRoles.includes(userRoleData.role)
    : userRoleData.role === allowedRoles;

  if (!hasAccess) {
    return fallback || (
      <div className="text-red-500">
        Access denied. Required role(s): {Array.isArray(allowedRoles) 
          ? allowedRoles.join(', ') 
          : allowedRoles}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to get current user role and status
 */
export function useUserRole() {
  const { user, isLoaded } = useUser();
  const [userRoleData, setUserRoleData] = useState<UserRoleData>({
    role: UserRole.PATIENT,
    status: 'loading',
    loading: true,
  });

  useEffect(() => {
    async function fetchUserRole() {
      if (!isLoaded || !user) {
        setUserRoleData(prev => ({ ...prev, loading: false, error: 'User not authenticated' }));
        return;
      }

      try {
        const response = await fetch('/api/users/role');
        if (response.ok) {
          const data = await response.json();
          setUserRoleData({
            role: data.role,
            status: data.status,
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

    fetchUserRole();
  }, [user, isLoaded]);

  return userRoleData;
}

/**
 * Convenience components for specific roles
 */
export function PatientOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess allowedRoles={UserRole.PATIENT} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

export function DoctorOnly({ children, fallback, requireActiveStatus = false }: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  requireActiveStatus?: boolean;
}) {
  return (
    <RoleBasedAccess 
      allowedRoles={UserRole.DOCTOR} 
      fallback={fallback}
      requireActiveStatus={requireActiveStatus}
    >
      {children}
    </RoleBasedAccess>
  );
}

export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedAccess allowedRoles={UserRole.ADMIN} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

/**
 * Component that shows different content based on user role
 */
interface RoleBasedContentProps {
  patientContent?: React.ReactNode;
  doctorContent?: React.ReactNode;
  adminContent?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleBasedContent({ 
  patientContent, 
  doctorContent, 
  adminContent, 
  fallback 
}: RoleBasedContentProps) {
  const { role, loading, error } = useUserRole();

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (error) {
    return fallback || <div className="text-red-500">Error loading content</div>;
  }

  switch (role) {
    case UserRole.PATIENT:
      return <>{patientContent || fallback}</>;
    case UserRole.DOCTOR:
      return <>{doctorContent || fallback}</>;
    case UserRole.ADMIN:
      return <>{adminContent || fallback}</>;
    default:
      return <>{fallback}</>;
  }
}

/**
 * Higher-order component for role-based page protection
 */
export function withRoleProtection<T extends object>(
  Component: React.ComponentType<T>,
  allowedRoles: UserRole | UserRole[],
  requireActiveStatus = true
) {
  return function ProtectedComponent(props: T) {
    return (
      <RoleBasedAccess 
        allowedRoles={allowedRoles} 
        requireActiveStatus={requireActiveStatus}
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </div>
        }
      >
        <Component {...props} />
      </RoleBasedAccess>
    );
  };
}
