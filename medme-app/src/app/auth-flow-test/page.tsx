'use client';

import { useState } from 'react';

export default function AuthFlowTestPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const testSteps = [
    {
      title: "🔐 Authentication Test",
      description: "Test the complete authentication flow",
      action: "Sign In",
      url: "https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=" + 
           encodeURIComponent("http://localhost:3000/auth-status"),
      expected: "Should redirect to Clerk sign-in page, then back to auth-status"
    },
    {
      title: "👤 Role Selection Test",
      description: "Test role selection after authentication",
      action: "Test Onboarding",
      url: "/onboarding",
      expected: "Should show role selection (Patient/Doctor/Admin)"
    },
    {
      title: "📊 Dashboard Access Test",
      description: "Test dashboard access after role selection",
      action: "Test Dashboard",
      url: "/dashboard",
      expected: "Should show appropriate dashboard based on role"
    },
    {
      title: "🔄 API Authentication Test",
      description: "Test API calls with authenticated user",
      action: "Test API",
      url: "/api/users/role",
      expected: "Should return user role data instead of 401"
    }
  ];

  const handleStepTest = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🧪 Authentication Flow Test
        </h1>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            📋 Testing Instructions
          </h2>
          <ol className="text-blue-700 space-y-2 list-decimal list-inside">
            <li>Follow each test step in order</li>
            <li>Complete the action and verify the expected result</li>
            <li>Mark each step as ✅ Pass or ❌ Fail</li>
            <li>Report any issues or unexpected behavior</li>
          </ol>
        </div>

        {/* Test Steps */}
        <div className="space-y-6">
          {testSteps.map((step, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Step {index + 1}: {step.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{step.description}</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Expected:</strong> {step.expected}
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handleStepTest(step.url)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    {step.action}
                  </button>
                </div>
              </div>
              
              {/* Result tracking */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Test Result:</p>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">
                    ✅ Pass
                  </button>
                  <button className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200">
                    ❌ Fail
                  </button>
                  <button className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200">
                    ⏳ Testing
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access Links */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🔗 Quick Access Links</h3>
          <div className="grid grid-cols-2 gap-4">
            <a 
              href="/auth-status" 
              className="block p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors text-center"
            >
              🔐 Auth Status
            </a>
            <a 
              href="/auth" 
              className="block p-3 bg-green-50 rounded hover:bg-green-100 transition-colors text-center"
            >
              🚪 Sign In/Up
            </a>
            <a 
              href="/onboarding" 
              className="block p-3 bg-purple-50 rounded hover:bg-purple-100 transition-colors text-center"
            >
              👤 Onboarding
            </a>
            <a 
              href="/dashboard" 
              className="block p-3 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors text-center"
            >
              📊 Dashboard
            </a>
          </div>
        </div>

        {/* Direct Clerk Links */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🎯 Direct Clerk Authentication</h3>
          <div className="space-y-3">
            <a
              href="https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=http%3A//localhost%3A3000/auth-status"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔐 Direct Sign In (New Tab)
            </a>
            <a
              href="https://smiling-drake-96.clerk.accounts.dev/sign-up?redirect_url=http%3A//localhost%3A3000/onboarding"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              📝 Direct Sign Up (New Tab)
            </a>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            These links go directly to Clerk's hosted authentication pages and should work immediately.
          </p>
        </div>

        {/* Troubleshooting */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            🔧 Troubleshooting
          </h3>
          <div className="text-yellow-700 space-y-2">
            <p><strong>If authentication fails:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Try the "Direct Clerk Authentication" links above</li>
              <li>Check browser console for errors</li>
              <li>Verify you're redirected back to localhost:3000</li>
              <li>Test the /auth-status page to see authentication state</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
