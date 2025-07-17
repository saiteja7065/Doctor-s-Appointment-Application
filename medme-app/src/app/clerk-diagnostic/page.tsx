'use client';

import { useAuth, useClerk, useUser, SignIn } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function ClerkDiagnosticPage() {
  const { isLoaded: authLoaded, userId, sessionId, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const clerk = useClerk();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    console.log('🔍 Clerk Diagnostic - Starting...');
    
    try {
      // Check environment variables
      const envVars = {
        publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
        signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
        afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
        afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
      };

      console.log('📝 Environment Variables:', envVars);

      // Check Clerk hooks
      const hookStatus = {
        authLoaded,
        userLoaded,
        isSignedIn,
        userId,
        sessionId,
        hasClerk: !!clerk,
        hasUser: !!user,
      };

      console.log('🔗 Clerk Hooks Status:', hookStatus);

      // Check global Clerk
      let globalClerk = null;
      if (typeof window !== 'undefined') {
        globalClerk = (window as any).Clerk;
        console.log('🌐 Global Clerk:', globalClerk);
      }

      // Check Clerk instance methods
      let clerkMethods = [];
      if (clerk) {
        try {
          clerkMethods = Object.getOwnPropertyNames(clerk);
          console.log('⚙️ Clerk Methods:', clerkMethods);
        } catch (error: any) {
          console.error('Error getting Clerk methods:', error);
          setErrors(prev => [...prev, `Clerk methods error: ${error.message}`]);
        }
      }

      setDiagnostics({
        environment: envVars,
        hooks: hookStatus,
        globalClerk: !!globalClerk,
        clerkMethods: clerkMethods.slice(0, 10), // First 10 methods
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('🚨 Diagnostic Error:', error);
      setErrors(prev => [...prev, `Diagnostic error: ${error.message}`]);
    }
  }, [authLoaded, userLoaded, isSignedIn, userId, sessionId, clerk, user]);

  const testClerkComponent = () => {
    try {
      console.log('🧪 Testing Clerk component rendering...');
      // This will help us see if the component can render
      return true;
    } catch (error: any) {
      console.error('Component test error:', error);
      setErrors(prev => [...prev, `Component test error: ${error.message}`]);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🔍 Clerk Integration Diagnostic
        </h1>

        {/* Environment Variables */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Environment Configuration</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Publishable Key:</strong>
                <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
                  {diagnostics.environment?.publishableKey || 'Not set'}
                </div>
              </div>
              <div>
                <strong>Key Format Valid:</strong>
                <div className={`p-2 rounded text-sm ${
                  diagnostics.environment?.publishableKey?.startsWith('pk_') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {diagnostics.environment?.publishableKey?.startsWith('pk_') ? '✅ Valid' : '❌ Invalid'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Sign In URL:</strong>
                <div className="bg-gray-100 p-2 rounded text-sm">
                  {diagnostics.environment?.signInUrl || 'Not set'}
                </div>
              </div>
              <div>
                <strong>Sign Up URL:</strong>
                <div className="bg-gray-100 p-2 rounded text-sm">
                  {diagnostics.environment?.signUpUrl || 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clerk Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">⚡ Clerk Loading Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${authLoaded ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
              <h3 className={`font-semibold ${authLoaded ? 'text-green-800' : 'text-red-800'}`}>
                Auth Hook
              </h3>
              <p className={`${authLoaded ? 'text-green-700' : 'text-red-700'}`}>
                {authLoaded ? '✅ Loaded' : '❌ Not Loaded'}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${userLoaded ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
              <h3 className={`font-semibold ${userLoaded ? 'text-green-800' : 'text-red-800'}`}>
                User Hook
              </h3>
              <p className={`${userLoaded ? 'text-green-700' : 'text-red-700'}`}>
                {userLoaded ? '✅ Loaded' : '❌ Not Loaded'}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${diagnostics.globalClerk ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
              <h3 className={`font-semibold ${diagnostics.globalClerk ? 'text-green-800' : 'text-red-800'}`}>
                Global Clerk
              </h3>
              <p className={`${diagnostics.globalClerk ? 'text-green-700' : 'text-red-700'}`}>
                {diagnostics.globalClerk ? '✅ Available' : '❌ Missing'}
              </p>
            </div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">🚨 Errors</h2>
            <ul className="space-y-2">
              {errors.map((error, index) => (
                <li key={index} className="text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Component Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Component Test</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">SignIn Component Test:</h3>
              <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  The SignIn component should render below. If you see only this text, the component is not loading:
                </p>
                <div className="bg-blue-50 p-4 rounded">
                  {testClerkComponent() && (
                    <SignIn 
                      appearance={{
                        elements: {
                          card: 'shadow-none border border-gray-200',
                        }
                      }}
                      routing="hash"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Debug Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
