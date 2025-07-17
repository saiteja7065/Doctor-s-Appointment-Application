'use client';

import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function ClerkTestSimple() {
  const { isLoaded: authLoaded, userId, sessionId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const clerk = useClerk();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    console.log('🔍 Clerk Test Simple - Component mounted');
    console.log('- authLoaded:', authLoaded);
    console.log('- userLoaded:', userLoaded);
    console.log('- userId:', userId);
    console.log('- sessionId:', sessionId);
    console.log('- user:', user);
    console.log('- clerk:', clerk);

    // Check if Clerk is available globally
    if (typeof window !== 'undefined') {
      console.log('- window.Clerk:', (window as any).Clerk);
    }

    setDebugInfo({
      authLoaded,
      userLoaded,
      userId,
      sessionId,
      hasUser: !!user,
      hasClerk: !!clerk,
      timestamp: new Date().toISOString(),
    });

    // Test Clerk methods
    if (clerk) {
      try {
        console.log('- clerk.loaded:', clerk.loaded);
        console.log('- clerk.user:', clerk.user);
        console.log('- clerk.session:', clerk.session);
      } catch (error: any) {
        console.error('Error accessing clerk properties:', error);
        setErrors(prev => [...prev, `Clerk property error: ${error.message}`]);
      }
    } else {
      setErrors(prev => [...prev, 'Clerk object is null/undefined']);
    }
  }, [authLoaded, userLoaded, userId, sessionId, user, clerk]);

  const testDirectSignIn = () => {
    try {
      const url = 'https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=' + 
        encodeURIComponent('http://localhost:3000/clerk-test-simple');
      console.log('🔗 Redirecting to:', url);
      window.location.href = url;
    } catch (error: any) {
      console.error('Error with direct sign-in:', error);
      setErrors(prev => [...prev, `Direct sign-in error: ${error.message}`]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🧪 Clerk Simple Test
        </h1>

        {/* Loading Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Loading Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded ${authLoaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>Auth Loaded:</strong> {authLoaded ? '✅ Yes' : '❌ No'}
            </div>
            <div className={`p-3 rounded ${userLoaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>User Loaded:</strong> {userLoaded ? '✅ Yes' : '❌ No'}
            </div>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div className={`p-3 rounded ${userId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              <strong>User ID:</strong> {userId || 'None'}
            </div>
            <div className={`p-3 rounded ${sessionId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              <strong>Session ID:</strong> {sessionId || 'None'}
            </div>
            <div className={`p-3 rounded ${clerk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>Clerk Object:</strong> {clerk ? '✅ Available' : '❌ Missing'}
            </div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-red-800">Errors</h2>
            <ul className="space-y-2">
              {errors.map((error, index) => (
                <li key={index} className="text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={testDirectSignIn}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Test Direct Sign In
            </button>
            <div className="text-sm text-gray-600">
              This will redirect to Clerk's hosted sign-in page
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
