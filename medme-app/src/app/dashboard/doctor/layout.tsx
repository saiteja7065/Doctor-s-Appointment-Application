'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DoctorNavigation from '@/components/navigation/DoctorNavigation';

export default function DoctorDashboardLayout({
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
          if (data.role === 'doctor') {
            setIsAuthorized(true);
          } else {
            // Redirect non-doctors to appropriate dashboard
            if (data.role === 'patient') {
              router.push('/dashboard/patient');
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
      <DoctorNavigation />
      <main className="lg:pl-64">
        {children}
      </main>
    </div>
  );
}
