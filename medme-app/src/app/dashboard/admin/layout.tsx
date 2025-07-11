'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavigation from '@/components/navigation/AdminNavigation';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch('/api/users/role');
        if (response.ok) {
          const data = await response.json();
          if (data.role === 'admin') {
            setIsAuthorized(true);
          } else {
            // Redirect non-admins to appropriate dashboard
            if (data.role === 'patient') {
              router.push('/dashboard/patient');
            } else if (data.role === 'doctor') {
              router.push('/dashboard/doctor');
            } else {
              router.push('/dashboard');
            }
          }
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        router.push('/dashboard');
      }
    };

    checkAuthorization();
  }, [isLoaded, user, router]);

  if (!isLoaded || !isAuthorized) {
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
      <AdminNavigation />
      <main className="lg:pl-64">
        {children}
      </main>
    </div>
  );
}
