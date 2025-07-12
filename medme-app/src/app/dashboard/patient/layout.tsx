'use client';

import { useUser, UserButton } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import { Card } from '@/components/ui/card';
import { Stethoscope, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PatientNavigation from '@/components/navigation/PatientNavigation';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useState } from 'react';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center medical-gradient">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-gradient">
      {/* Header */}
      <header className="glass-card border-b sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">MedMe</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-muted-foreground">Patient</div>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                }
              }}
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="h-full pt-16 lg:pt-0">
            <Card className="h-full glass-card rounded-none lg:rounded-r-lg border-l-0 lg:border-l">
              <div className="p-6">
                <div className="mb-6 animate-fade-in-up">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Patient Dashboard
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your healthcare journey
                  </p>
                </div>
                
                <PatientNavigation />
              </div>
            </Card>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
