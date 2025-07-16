'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function TestClerkSimple() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && userLoaded) {
      setDebugInfo({
        auth: {
          isLoaded,
          userId,
          sessionId,
          hasToken: !!getToken,
        },
        user: {
          isLoaded: userLoaded,
          isSignedIn,
          userEmail: user?.emailAddresses?.[0]?.emailAddress,
          userName: user?.fullName,
        },
        environment: {
          publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }, [isLoaded, userLoaded, userId, sessionId, isSignedIn, user]);

  if (!isLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading Clerk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🧪 Simple Clerk Test
        </h1>

        <div className="grid gap-6">
          {/* Authentication Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <div className={`p-3 rounded ${isSignedIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Status:</strong> {isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}
              </div>
              {isSignedIn && (
                <div className="bg-blue-100 text-blue-800 p-3 rounded">
                  <strong>Welcome:</strong> {user?.fullName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
                </div>
              )}
            </div>
          </div>

          {/* Debug Information */}
          {debugInfo && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              {!isSignedIn ? (
                <div className="space-y-2">
                  <a 
                    href="/sign-in" 
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Go to Sign In
                  </a>
                  <br />
                  <a 
                    href="/sign-up" 
                    className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                  >
                    Go to Sign Up
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <a 
                    href="/dashboard" 
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard
                  </a>
                  <br />
                  <button 
                    onClick={() => window.location.href = '/api/auth/signout'}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Environment Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Publishable Key:</strong> 
                <code className="bg-gray-100 px-2 py-1 rounded ml-2">
                  {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 
                    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.substring(0, 20) + '...' : 
                    'Not found'
                  }
                </code>
              </div>
              <div>
                <strong>App URL:</strong> 
                <code className="bg-gray-100 px-2 py-1 rounded ml-2">
                  {process.env.NEXT_PUBLIC_APP_URL || 'Not found'}
                </code>
              </div>
              <div>
                <strong>Current URL:</strong> 
                <code className="bg-gray-100 px-2 py-1 rounded ml-2">
                  {typeof window !== 'undefined' ? window.location.href : 'Server-side'}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
