'use client';

import { SignUp } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Removed framer-motion for better performance - using CSS animations

export default function SignUpPage() {
  const [showFallback, setShowFallback] = useState(false);
  const router = useRouter();

  // Check if Clerk is working, if not show fallback after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDemoSignUp = () => {
    // Redirect to demo authentication
    router.push('/demo-auth');
  };

  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Join MedMe
          </h1>
          <p className="text-muted-foreground">
            Create your account to start your healthcare journey
          </p>
        </div>

        <div className="glass-card p-6 rounded-lg animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  'bg-primary hover:bg-primary/90 text-primary-foreground transition-colors',
                card: 'bg-transparent shadow-none',
                headerTitle: 'text-foreground',
                headerSubtitle: 'text-muted-foreground',
                socialButtonsBlockButton:
                  'border-border hover:bg-accent transition-colors',
                formFieldInput:
                  'border-border bg-background focus:ring-primary',
                footerActionLink: 'text-primary hover:text-primary/80',
              },
            }}
            routing="path"
            path="/sign-up"
            fallbackRedirectUrl="/onboarding"
            signInUrl="/sign-in"
          />

          {/* Fallback content if Clerk doesn't load */}
          {showFallback && (
            <div className="fallback-signup mt-6 p-4 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Having trouble with sign-up? Try our demo mode:
                </p>
                <button
                  onClick={handleDemoSignUp}
                  className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Continue with Demo Account
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  Perfect for testing the application
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Alternative Options */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Already have an account?
          </p>
          <a
            href="/sign-in"
            className="text-primary hover:text-primary/80 underline text-sm"
          >
            Sign in here
          </a>
        </div>

        {/* Debug Info */}
        {showFallback && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 text-sm mb-2">
              🔧 Development Notice
            </h4>
            <p className="text-xs text-yellow-700">
              Clerk authentication is not fully configured. Using demo mode for testing.
              Check the CLERK_SETUP_GUIDE.md for proper setup instructions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
