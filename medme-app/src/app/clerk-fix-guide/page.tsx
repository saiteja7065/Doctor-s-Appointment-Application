'use client';

import { useState } from 'react';

export default function ClerkFixGuide() {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "🔍 Problem Identified",
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Issue Found:</h3>
            <ul className="text-red-700 space-y-1">
              <li>• Invalid Clerk publishable key format</li>
              <li>• Key was base64 encoded domain instead of actual API key</li>
              <li>• Causing Clerk authentication to fail to load</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Current Status:</h3>
            <p className="text-yellow-700">
              Environment variables have been updated with placeholder keys. 
              Real Clerk keys need to be obtained from the Clerk dashboard.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "🔧 How to Fix",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Step 1: Get Clerk Keys</h3>
            <ol className="text-blue-700 space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://dashboard.clerk.com" target="_blank" className="underline">https://dashboard.clerk.com</a></li>
              <li>Create a new application or select existing one</li>
              <li>Go to "API Keys" section</li>
              <li>Copy the "Publishable key" (starts with pk_test_ or pk_live_)</li>
              <li>Copy the "Secret key" (starts with sk_test_ or sk_live_)</li>
            </ol>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Step 2: Update Environment</h3>
            <p className="text-green-700 mb-2">Replace the placeholder keys in .env.local:</p>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_real_key_here
CLERK_SECRET_KEY=sk_test_your_real_key_here`}
            </pre>
          </div>
        </div>
      )
    },
    {
      title: "⚙️ Configuration Steps",
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">Step 3: Configure Clerk App</h3>
            <p className="text-purple-700 mb-2">In your Clerk dashboard, configure:</p>
            <ul className="text-purple-700 space-y-1 list-disc list-inside">
              <li><strong>Allowed redirect URLs:</strong> http://localhost:3000/dashboard</li>
              <li><strong>Allowed origins:</strong> http://localhost:3000</li>
              <li><strong>Sign-in URL:</strong> http://localhost:3000/sign-in</li>
              <li><strong>Sign-up URL:</strong> http://localhost:3000/sign-up</li>
            </ul>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-800 mb-2">Step 4: Restart Server</h3>
            <p className="text-indigo-700">After updating .env.local, restart the development server:</p>
            <pre className="bg-gray-100 p-3 rounded text-sm mt-2">
npm run dev
            </pre>
          </div>
        </div>
      )
    },
    {
      title: "✅ Testing",
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">Step 5: Test Authentication</h3>
            <ol className="text-green-700 space-y-2 list-decimal list-inside">
              <li>Visit <a href="/clerk-test-simple" className="underline">/clerk-test-simple</a> to check if Clerk loads</li>
              <li>Visit <a href="/sign-in" className="underline">/sign-in</a> to see if the sign-in form appears</li>
              <li>Try signing up/signing in with a test account</li>
              <li>Test the onboarding flow at <a href="/onboarding" className="underline">/onboarding</a></li>
            </ol>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Expected Results:</h3>
            <ul className="text-yellow-700 space-y-1 list-disc list-inside">
              <li>✅ Auth Loaded: Yes</li>
              <li>✅ User Loaded: Yes</li>
              <li>✅ Clerk sign-in form appears</li>
              <li>✅ Role selection works after sign-in</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          🔧 Clerk Authentication Fix Guide
        </h1>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index + 1 <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">{steps[step - 1].title}</h2>
          {steps[step - 1].content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setStep(Math.min(steps.length, step + 1))}
            disabled={step === steps.length}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Test Links</h3>
          <div className="grid grid-cols-2 gap-4">
            <a href="/clerk-test-simple" className="block p-3 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
              🧪 Clerk Test Simple
            </a>
            <a href="/sign-in" className="block p-3 bg-green-50 rounded hover:bg-green-100 transition-colors">
              🔐 Sign In Page
            </a>
            <a href="/onboarding" className="block p-3 bg-purple-50 rounded hover:bg-purple-100 transition-colors">
              👤 Onboarding
            </a>
            <a href="/api/test-clerk" className="block p-3 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors">
              🔧 API Test
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
