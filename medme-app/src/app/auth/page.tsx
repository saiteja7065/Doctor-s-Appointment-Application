'use client';

import { useEffect, useState } from 'react';

export default function AuthPage() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSignIn = () => {
    setIsRedirecting(true);
    const signInUrl = 'https://smiling-drake-96.clerk.accounts.dev/sign-in?redirect_url=' + 
      encodeURIComponent('http://localhost:3000/dashboard');
    window.location.href = signInUrl;
  };

  const handleSignUp = () => {
    setIsRedirecting(true);
    const signUpUrl = 'https://smiling-drake-96.clerk.accounts.dev/sign-up?redirect_url=' + 
      encodeURIComponent('http://localhost:3000/dashboard');
    window.location.href = signUpUrl;
  };

  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to MedMe
          </h1>
          <p className="text-muted-foreground">
            Your trusted medical consultation platform
          </p>
        </div>

        <div className="glass-card p-6 rounded-lg animate-fade-in-scale space-y-4">
          <button
            onClick={handleSignIn}
            disabled={isRedirecting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRedirecting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Redirecting...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <button
            onClick={handleSignUp}
            disabled={isRedirecting}
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRedirecting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Redirecting...
              </div>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Secure authentication powered by Clerk
            </p>
          </div>
        </div>

        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <span>🔒 Secure</span>
            <span>⚡ Fast</span>
            <span>🏥 Medical Grade</span>
          </div>
        </div>
      </div>
    </div>
  );
}
