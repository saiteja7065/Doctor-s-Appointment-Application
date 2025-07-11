'use client';

import { SignUp } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations

export default function SignUpPage() {
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
            redirectUrl="/onboarding"
            signInUrl="/sign-in"
          />
        </div>

        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
