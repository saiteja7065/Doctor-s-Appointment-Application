'use client';

import { useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Stethoscope, 
  Shield, 
  Users, 
  DollarSign, 
  Settings, 
  BarChart3,
  FileText,
  Activity,
  Menu,
  X,
  Bell,
  UserCheck,
  CreditCard,
  AlertTriangle,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard/admin',
    icon: BarChart3,
    description: 'Overview and analytics'
  },
  {
    name: 'Doctor Verification',
    href: '/dashboard/admin/doctors',
    icon: Shield,
    description: 'Review and approve doctors',
    badge: 'pending'
  },
  {
    name: 'User Management',
    href: '/dashboard/admin/users',
    icon: Users,
    description: 'Manage all user accounts'
  },
  {
    name: 'Financial Oversight',
    href: '/dashboard/admin/financial',
    icon: DollarSign,
    description: 'Monitor transactions and withdrawals'
  },
  {
    name: 'Appointments',
    href: '/dashboard/admin/appointments',
    icon: Activity,
    description: 'System-wide appointment monitoring'
  },
  {
    name: 'Audit Logs',
    href: '/dashboard/admin/audit-logs',
    icon: Shield,
    description: 'Security and activity monitoring'
  },
  {
    name: 'Analytics',
    href: '/dashboard/admin/analytics',
    icon: BarChart3,
    description: 'Platform performance metrics'
  },
  {
    name: 'System Logs',
    href: '/dashboard/admin/logs',
    icon: FileText,
    description: 'Audit trails and system logs'
  },
  {
    name: 'Settings',
    href: '/dashboard/admin/settings',
    icon: Settings,
    description: 'System configuration'
  },
];

export default function AdminNavigation() {
  const { user } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="glass-card"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ 
          x: isMobileMenuOpen ? 0 : -300 
        }}
        transition={{ duration: 0.3 }}
        className={`
          fixed top-0 left-0 z-40 w-64 h-screen
          lg:translate-x-0 lg:static lg:z-auto
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full px-3 py-4 overflow-y-auto glass-card border-r">
          {/* Header */}
          <div className="flex items-center mb-8 px-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">System Management</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-3 mb-6 px-3 py-2 rounded-lg bg-primary/5">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Administrator
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Admin
            </Badge>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                    transition-all duration-200 hover:bg-primary/10
                    ${isActive 
                      ? 'bg-primary/15 text-primary border-r-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 transition-colors duration-200
                    ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
                  `} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="text-xs ml-2">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System Status */}
          <div className="mt-8 px-3">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  System Online
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                All services operational
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 px-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserCheck className="h-3 w-3 mr-2" />
                Review Doctors
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <CreditCard className="h-3 w-3 mr-2" />
                Process Withdrawals
              </Button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
