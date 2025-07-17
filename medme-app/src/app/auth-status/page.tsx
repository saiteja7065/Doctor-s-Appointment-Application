'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthStatusPage() {
  const { isLoaded: authLoaded, userId, sessionId, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const router = useRouter();
  const [authData, setAuthData] = useState<any>(null);

  useEffect(() => {
    if (authLoaded && userLoaded) {
      setAuthData({
        isSignedIn,
        userId,
        sessionId,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          emailAddresses: user.emailAddresses?.map(email => email.emailAddress),
          createdAt: user.createdAt,
        } : null,
        timestamp: new Date().toISOString(),
      });
    }
  }, [authLoaded, userLoaded, isSignedIn, userId, sessionId, user]);

  const handleSignOut = async () => {
    try {
      // Redirect to Clerk's sign-out
      window.location.href = 'https://smiling-drake-96.clerk.accounts.dev/sign-out?redirect_url=' + 
        encodeURIComponent('http://localhost:3000');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const testRoleSelection = () => {
    router.push('/onboarding');
  };

  const testDashboard = () => {
    router.push('/dashboard');
  };

  if (!authLoaded || !userLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🔐 Authentication Status
        </h1>

        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${isSignedIn ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
              <h3 className={`font-semibold ${isSignedIn ? 'text-green-800' : 'text-red-800'}`}>
                Authentication
              </h3>
              <p className={`${isSignedIn ? 'text-green-700' : 'text-red-700'}`}>
                {isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${authLoaded ? 'bg-green-100 border border-green-200' : 'bg-yellow-100 border border-yellow-200'}`}>
              <h3 className={`font-semibold ${authLoaded ? 'text-green-800' : 'text-yellow-800'}`}>
                Clerk Status
              </h3>
              <p className={`${authLoaded ? 'text-green-700' : 'text-yellow-700'}`}>
                {authLoaded ? '✅ Loaded' : '⏳ Loading'}
              </p>
            </div>
          </div>
        </div>

        {/* User Information */}
        {isSignedIn && authData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">User ID:</span>
                <span className="text-gray-600">{authData.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Session ID:</span>
                <span className="text-gray-600">{authData.sessionId}</span>
              </div>
              {authData.user && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span className="text-gray-600">
                      {authData.user.firstName} {authData.user.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span className="text-gray-600">
                      {authData.user.emailAddresses?.[0] || 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Debug Information */}
        {authData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authData, null, 2)}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            {!isSignedIn ? (
              <div className="space-y-3">
                <a
                  href="/auth"
                  className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In / Sign Up
                </a>
                <a
                  href="https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=http%3A//localhost%3A3000/auth-status"
                  className="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Direct Clerk Sign In
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={testRoleSelection}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Test Role Selection
                </button>
                <button
                  onClick={testDashboard}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Test Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-4">
            <a href="/" className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              🏠 Home
            </a>
            <a href="/onboarding" className="block p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
              👤 Onboarding
            </a>
            <a href="/dashboard" className="block p-3 bg-green-50 rounded hover:bg-green-100 transition-colors">
              📊 Dashboard
            </a>
            <a href="/clerk-test-simple" className="block p-3 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors">
              🧪 Clerk Test
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
