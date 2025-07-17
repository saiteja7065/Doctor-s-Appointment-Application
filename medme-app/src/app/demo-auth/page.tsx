'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoAuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const router = useRouter();

  const handleDemoAuth = async (role: 'patient' | 'doctor' | 'admin') => {
    setIsLoading(true);
    
    try {
      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create demo user session
      const demoUser = {
        id: `demo_${role}_${Date.now()}`,
        email: `demo.${role}@medme.com`,
        firstName: 'Demo',
        lastName: role.charAt(0).toUpperCase() + role.slice(1),
        role: role,
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage for demo purposes
      localStorage.setItem('demoUser', JSON.stringify(demoUser));
      localStorage.setItem('demoAuth', 'true');

      // Redirect based on role
      switch (role) {
        case 'patient':
          router.push('/dashboard/patient');
          break;
        case 'doctor':
          router.push('/dashboard/doctor');
          break;
        case 'admin':
          router.push('/dashboard/admin');
          break;
        default:
          router.push('/dashboard');
      }
    } catch (error) {
      console.error('Demo auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignOut = () => {
    localStorage.removeItem('demoUser');
    localStorage.removeItem('demoAuth');
    router.push('/');
  };

  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            🧪 Demo Authentication
          </h1>
          <p className="text-muted-foreground">
            Test the application without real Clerk keys
          </p>
        </div>

        <div className="glass-card p-6 rounded-lg space-y-6">
          {/* Mode Selection */}
          <div className="flex space-x-2">
            <button
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                authMode === 'signin'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                authMode === 'signup'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Demo User Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-center">
              {authMode === 'signin' ? 'Sign in as:' : 'Sign up as:'}
            </h3>
            
            {/* Patient */}
            <button
              onClick={() => handleDemoAuth('patient')}
              disabled={isLoading}
              className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  👤
                </div>
                <div className="text-left">
                  <div className="font-semibold text-blue-800">Patient</div>
                  <div className="text-sm text-blue-600">Book appointments and consultations</div>
                </div>
              </div>
            </button>

            {/* Doctor */}
            <button
              onClick={() => handleDemoAuth('doctor')}
              disabled={isLoading}
              className="w-full p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                  🩺
                </div>
                <div className="text-left">
                  <div className="font-semibold text-green-800">Doctor</div>
                  <div className="text-sm text-green-600">Provide medical consultations</div>
                </div>
              </div>
            </button>

            {/* Admin */}
            <button
              onClick={() => handleDemoAuth('admin')}
              disabled={isLoading}
              className="w-full p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  ⚙️
                </div>
                <div className="text-left">
                  <div className="font-semibold text-purple-800">Admin</div>
                  <div className="text-sm text-purple-600">Manage platform and users</div>
                </div>
              </div>
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Authenticating...</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Demo Mode</h4>
            <p className="text-sm text-yellow-700">
              This is a demo authentication system. To use real Clerk authentication, 
              follow the setup guide in CLERK_SETUP_GUIDE.md
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-4 text-center space-y-2">
          <a 
            href="/clerk-diagnostic" 
            className="block text-sm text-blue-600 hover:text-blue-800 underline"
          >
            🔍 Check Clerk Status
          </a>
          <a 
            href="/sign-in" 
            className="block text-sm text-green-600 hover:text-green-800 underline"
          >
            🔐 Try Real Clerk Sign-In
          </a>
          <a 
            href="/" 
            className="block text-sm text-gray-600 hover:text-gray-800 underline"
          >
            🏠 Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
