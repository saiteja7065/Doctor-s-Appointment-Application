'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
// Removed framer-motion for better performance - using CSS animations
import { Button } from '@/components/ui/button';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import {
  Home,
  User,
  Calendar,
  CreditCard,
  Settings,
  Stethoscope,
  Bell
} from 'lucide-react';

const navigationItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    description: 'Overview and quick actions',
  },
  {
    href: '/dashboard/patient/profile',
    label: 'My Profile',
    icon: User,
    description: 'Manage personal information',
  },
  {
    href: '/dashboard/patient/appointments',
    label: 'Appointments',
    icon: Calendar,
    description: 'View and manage appointments',
  },
  {
    href: '/dashboard/patient/doctors',
    label: 'Find Doctors',
    icon: Stethoscope,
    description: 'Browse and book with doctors',
  },
  {
    href: '/dashboard/patient/billing',
    label: 'Billing & Credits',
    icon: CreditCard,
    description: 'Manage subscriptions and credits',
  },
  {
    href: '/dashboard/patient/notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'View your notifications',
  },
  {
    href: '/dashboard/patient/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Account and privacy settings',
  },
];

export default function PatientNavigation() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {navigationItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <div
            key={item.href}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <Link href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start h-auto p-4 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center space-x-3 w-full">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
