'use client';

import { useState } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
// Removed framer-motion for better performance - using CSS animations
import { 
  Stethoscope, 
  Calendar, 
  Users, 
  DollarSign, 
  Settings, 
  BarChart3,
  Clock,
  Video,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard/doctor',
    icon: BarChart3,
    description: 'Overview and statistics'
  },
  {
    name: 'Appointments',
    href: '/dashboard/doctor/appointments',
    icon: Calendar,
    description: 'Manage your appointments'
  },
  {
    name: 'Patients',
    href: '/dashboard/doctor/patients',
    icon: Users,
    description: 'View patient information'
  },
  {
    name: 'Availability',
    href: '/dashboard/doctor/availability',
    icon: Clock,
    description: 'Set your schedule'
  },
  {
    name: 'Consultations',
    href: '/dashboard/doctor/consultations',
    icon: Video,
    description: 'Video consultation history'
  },
  {
    name: 'Earnings',
    href: '/dashboard/doctor/earnings',
    icon: DollarSign,
    description: 'Track your earnings'
  },
  {
    name: 'Profile',
    href: '/dashboard/doctor/profile',
    icon: User,
    description: 'Manage your profile'
  },
  {
    name: 'Settings',
    href: '/dashboard/doctor/settings',
    icon: Settings,
    description: 'Account settings'
  },
];

export default function DoctorNavigation() {
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
      <aside
        className={`
          fixed top-0 left-0 z-40 w-64 h-full glass-card border-r transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">MedMe</h1>
              <p className="text-xs text-muted-foreground">Doctor Portal</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Dr. {user?.firstName} {user?.lastName}
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.name}</span>
                {item.name === 'Appointments' && (
                  <Badge variant="secondary" className="text-xs">
                    3
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground text-center">
            <p>MedMe Doctor Portal</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
