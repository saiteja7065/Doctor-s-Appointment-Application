'use client';

import { useEffect, useState } from 'react';

export default function ClerkDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get client-side environment variables
    const clientEnv = {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    };

    // Extract domain from publishable key
    let clerkDomain = 'unknown';
    if (clientEnv.publishableKey) {
      try {
        // Decode the base64 part of the key to get the domain
        const keyParts = clientEnv.publishableKey.split('_');
        if (keyParts.length >= 3) {
          const encodedDomain = keyParts[2];
          clerkDomain = atob(encodedDomain);
        }
      } catch (e) {
        console.error('Failed to decode Clerk domain:', e);
      }
    }

    setDebugInfo({
      currentUrl: window.location.href,
      currentDomain: window.location.host,
      clerkDomain,
      environment: clientEnv,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Test Clerk API connectivity
    if (clientEnv.publishableKey) {
      fetch(`https://api.clerk.com/v1/public/environment`, {
        headers: {
          'Authorization': `Bearer ${clientEnv.publishableKey}`,
        },
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setDebugInfo(prev => ({ ...prev, clerkApiTest: 'success', clerkApiData: data }));
      })
      .catch(err => {
        setError(`Clerk API test failed: ${err.message}`);
        setDebugInfo(prev => ({ ...prev, clerkApiTest: 'failed', clerkApiError: err.message }));
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🔍 Clerk Configuration Debug
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {debugInfo && (
          <div className="space-y-6">
            {/* Current Configuration */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                📋 Current Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Current URL:</strong>
                  <br />
                  <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.currentUrl}</code>
                </div>
                <div>
                  <strong>Current Domain:</strong>
                  <br />
                  <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.currentDomain}</code>
                </div>
                <div>
                  <strong>Clerk Domain (from key):</strong>
                  <br />
                  <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.clerkDomain}</code>
                </div>
                <div>
                  <strong>App URL (env):</strong>
                  <br />
                  <code className="bg-gray-100 px-2 py-1 rounded">{debugInfo.environment.appUrl}</code>
                </div>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                🔑 Environment Variables
              </h2>
              <div className="space-y-2 text-sm">
                {Object.entries(debugInfo.environment).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium w-48">{key}:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded flex-1">
                      {key.includes('KEY') ? 
                        (value ? `${String(value).substring(0, 20)}...` : 'Not set') : 
                        String(value || 'Not set')
                      }
                    </code>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain Mismatch Check */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                ⚠️ Domain Mismatch Analysis
              </h2>
              <div className="space-y-3">
                <div className={`p-3 rounded ${
                  debugInfo.currentDomain === debugInfo.clerkDomain 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <strong>Domain Match:</strong> {
                    debugInfo.currentDomain === debugInfo.clerkDomain 
                      ? '✅ Domains match' 
                      : '❌ Domain mismatch detected'
                  }
                </div>
                
                {debugInfo.currentDomain !== debugInfo.clerkDomain && (
                  <div className="bg-yellow-100 text-yellow-800 p-3 rounded">
                    <strong>🔧 Fix Required:</strong>
                    <br />
                    Your Clerk app is configured for domain: <code>{debugInfo.clerkDomain}</code>
                    <br />
                    But your app is running on: <code>{debugInfo.currentDomain}</code>
                    <br />
                    <br />
                    <strong>Solutions:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Update Clerk Dashboard → Settings → Domains to include: <code>{debugInfo.currentDomain}</code></li>
                      <li>Or change your app URL to match: <code>{debugInfo.clerkDomain}</code></li>
                      <li>Or create a new Clerk app for <code>{debugInfo.currentDomain}</code></li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* API Test Results */}
            {debugInfo.clerkApiTest && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  🌐 Clerk API Connectivity
                </h2>
                <div className={`p-3 rounded ${
                  debugInfo.clerkApiTest === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <strong>API Test:</strong> {
                    debugInfo.clerkApiTest === 'success' 
                      ? '✅ Clerk API accessible' 
                      : `❌ ${debugInfo.clerkApiError}`
                  }
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                🚀 Quick Actions
              </h2>
              <div className="space-y-3">
                <a 
                  href="https://dashboard.clerk.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Open Clerk Dashboard
                </a>
                <div className="text-sm text-gray-600">
                  Go to Settings → Domains and add: <code>{debugInfo.currentDomain}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {!debugInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">Loading debug information...</div>
          </div>
        )}
      </div>
    </div>
  );
}
