'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function DebugClerkPage() {
  const { isLoaded, userId, sessionId } = useAuth();
  const clerk = useClerk();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('🔍 Clerk Debug Info:');
      console.log('- isLoaded:', isLoaded);
      console.log('- userId:', userId);
      console.log('- sessionId:', sessionId);
      console.log('- clerk object:', clerk);
      console.log('- Environment vars:');
      console.log('  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
      console.log('  - NEXT_PUBLIC_CLERK_SIGN_IN_URL:', process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL);
      console.log('  - NEXT_PUBLIC_CLERK_SIGN_UP_URL:', process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL);

      setDebugInfo({
        isLoaded,
        userId,
        sessionId,
        hasClerk: !!clerk,
        environment: {
          publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) + '...',
          signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
          signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
          afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
          afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
        },
        clerkMethods: clerk ? Object.getOwnPropertyNames(clerk) : [],
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('❌ Error in debug:', err);
      setError(err.message);
    }
  }, [isLoaded, userId, sessionId, clerk]);

  const testClerkMethods = () => {
    try {
      console.log('🧪 Testing Clerk methods...');
      if (clerk) {
        console.log('- clerk.loaded:', clerk.loaded);
        console.log('- clerk.user:', clerk.user);
        console.log('- clerk.session:', clerk.session);
      }
    } catch (err: any) {
      console.error('❌ Error testing methods:', err);
      setError(err.message);
    }
  };

  const redirectToClerkSignIn = () => {
    try {
      if (clerk) {
        clerk.redirectToSignIn();
      } else {
        // Fallback to direct URL
        window.location.href = 'https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=' + 
          encodeURIComponent('http://localhost:3000/dashboard');
      }
    } catch (err: any) {
      console.error('❌ Error redirecting:', err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🔍 Clerk Debug Information
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid gap-6">
          {/* Loading Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Loading Status</h2>
            <div className={`p-3 rounded ${isLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              <strong>Clerk Loaded:</strong> {isLoaded ? '✅ Yes' : '⏳ Loading...'}
            </div>
          </div>

          {/* Authentication Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <div className={`p-3 rounded ${userId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>User ID:</strong> {userId || 'Not signed in'}
              </div>
              <div className={`p-3 rounded ${sessionId ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Session ID:</strong> {sessionId || 'No session'}
              </div>
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
            <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={testClerkMethods}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors mr-3"
              >
                Test Clerk Methods
              </button>
              <button 
                onClick={redirectToClerkSignIn}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors mr-3"
              >
                Try Sign In
              </button>
              <a 
                href="https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=http%3A//localhost%3A3000/debug-clerk"
                className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              >
                Direct Clerk Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
