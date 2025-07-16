'use client';

import { useEffect } from 'react';

export default function AuthRedirectPage() {
  useEffect(() => {
    // Redirect directly to Clerk's hosted sign-in
    const clerkSignInUrl = 'https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=' + 
      encodeURIComponent('http://localhost:3000/dashboard');
    
    window.location.href = clerkSignInUrl;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to secure sign-in...</p>
        <p className="text-sm text-gray-500 mt-2">
          If you're not redirected automatically, 
          <a 
            href="https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=http%3A//localhost%3A3000/dashboard"
            className="text-blue-600 hover:underline ml-1"
          >
            click here
          </a>
        </p>
      </div>
    </div>
  );
}
