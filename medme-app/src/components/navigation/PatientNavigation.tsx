'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
    href: '/dashboard/patient/subscription',
    label: 'Subscription',
    icon: CreditCard,
    description: 'Manage credits and plans',
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
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
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
          </motion.div>
        );
      })}
    </nav>
  );
}
