'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/lib/types/user';
import { 
  Calendar, 
  User, 
  Settings, 
  CreditCard, 
  FileText, 
  Users, 
  DollarSign,
  Activity,
  Shield,
  Home
} from 'lucide-react';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
  requireActiveStatus?: boolean;
}

// Define navigation items with role-based access
const navigationItems: NavigationItem[] = [
  // Common items
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    roles: [UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN],
  },
  
  // Patient-specific items
  {
    href: '/patient/profile',
    label: 'My Profile',
    icon: User,
    roles: [UserRole.PATIENT],
  },
  {
    href: '/patient/appointments',
    label: 'My Appointments',
    icon: Calendar,
    roles: [UserRole.PATIENT],
  },
  {
    href: '/patient/book-appointment',
    label: 'Book Appointment',
    icon: Calendar,
    roles: [UserRole.PATIENT],
  },
  {
    href: '/patient/medical-history',
    label: 'Medical History',
    icon: FileText,
    roles: [UserRole.PATIENT],
  },
  {
    href: '/patient/billing',
    label: 'Billing & Credits',
    icon: CreditCard,
    roles: [UserRole.PATIENT],
  },
  
  // Doctor-specific items
  {
    href: '/doctor/profile',
    label: 'Doctor Profile',
    icon: User,
    roles: [UserRole.DOCTOR],
  },
  {
    href: '/doctor/appointments',
    label: 'Appointments',
    icon: Calendar,
    roles: [UserRole.DOCTOR],
    requireActiveStatus: false, // Allow pending doctors to see appointments
  },
  {
    href: '/doctor/availability',
    label: 'Availability',
    icon: Activity,
    roles: [UserRole.DOCTOR],
  },
  {
    href: '/doctor/patients',
    label: 'My Patients',
    icon: Users,
    roles: [UserRole.DOCTOR],
    requireActiveStatus: true, // Only active doctors can see patients
  },
  {
    href: '/doctor/earnings',
    label: 'Earnings',
    icon: DollarSign,
    roles: [UserRole.DOCTOR],
    requireActiveStatus: true,
  },
  
  // Admin-specific items
  {
    href: '/admin/users',
    label: 'User Management',
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    href: '/admin/doctors',
    label: 'Doctor Verification',
    icon: Shield,
    roles: [UserRole.ADMIN],
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: Activity,
    roles: [UserRole.ADMIN],
  },
  
  // Settings (available to all)
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: [UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN],
  },
];

interface UserRoleData {
  role: UserRole;
  status: string;
  loading: boolean;
  error?: string;
}

export function RoleBasedNavigation() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
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

  // Filter navigation items based on user role and status
  const filteredNavItems = navigationItems.filter(item => {
    // Check if user has required role
    if (!item.roles.includes(userRoleData.role)) {
      return false;
    }

    // Check if active status is required and user is not active
    if (item.requireActiveStatus && userRoleData.status !== 'active') {
      return false;
    }

    return true;
  });

  if (userRoleData.loading) {
    return (
      <nav className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
        ))}
      </nav>
    );
  }

  if (userRoleData.error) {
    return (
      <div className="text-red-500 text-sm p-4">
        Navigation unavailable: {userRoleData.error}
      </div>
    );
  }

  return (
    <nav className="space-y-1">
      {/* Role indicator */}
      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 mb-4">
        {userRoleData.role} Dashboard
        {userRoleData.status !== 'active' && (
          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
            {userRoleData.status}
          </span>
        )}
      </div>

      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${isActive
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <Icon
              className={`
                mr-3 h-5 w-5 transition-colors
                ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
              `}
            />
            {item.label}
          </Link>
        );
      })}

      {/* Role-specific warnings */}
      {userRoleData.role === UserRole.DOCTOR && userRoleData.status === 'pending' && (
        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Your doctor application is pending verification. Some features may be limited.
          </p>
        </div>
      )}

      {userRoleData.role === UserRole.DOCTOR && userRoleData.status === 'rejected' && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            Your doctor application was rejected. Please contact support for assistance.
          </p>
        </div>
      )}
    </nav>
  );
}

/**
 * Component to show role-specific quick actions
 */
export function RoleBasedQuickActions() {
  const { role, status, loading } = useUserRole();

  if (loading) {
    return <div className="animate-pulse h-20 bg-gray-200 rounded" />;
  }

  const quickActions = {
    [UserRole.PATIENT]: [
      { label: 'Book Appointment', href: '/patient/book-appointment', primary: true },
      { label: 'View History', href: '/patient/medical-history', primary: false },
    ],
    [UserRole.DOCTOR]: status === 'active' ? [
      { label: 'View Appointments', href: '/doctor/appointments', primary: true },
      { label: 'Update Availability', href: '/doctor/availability', primary: false },
    ] : [
      { label: 'Complete Application', href: '/doctor/apply', primary: true },
    ],
    [UserRole.ADMIN]: [
      { label: 'Verify Doctors', href: '/admin/doctors', primary: true },
      { label: 'View Analytics', href: '/admin/analytics', primary: false },
    ],
  };

  const actions = quickActions[role] || [];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`
            block w-full px-3 py-2 text-sm font-medium rounded-md text-center transition-colors
            ${action.primary
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Hook to get user role data
 */
function useUserRole() {
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
