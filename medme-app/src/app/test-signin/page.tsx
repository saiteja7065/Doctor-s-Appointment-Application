'use client';

import { SignIn } from '@clerk/nextjs';

export default function TestSignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test Sign In
          </h1>
          <p className="text-gray-600">
            Simple Clerk sign-in test without custom routing
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <SignIn 
            routing="hash"
            afterSignInUrl="/test-clerk-simple"
            afterSignUpUrl="/test-clerk-simple"
          />
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            If this doesn't work, check Clerk domain configuration
          </p>
        </div>
      </div>
    </div>
  );
}
