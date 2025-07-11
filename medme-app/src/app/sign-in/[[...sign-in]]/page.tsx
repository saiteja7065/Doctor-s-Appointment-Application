'use client';

import { SignIn } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations

export default function SignInPage() {
  return (
    <div className="min-h-screen medical-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to MedMe
          </h1>
          <p className="text-muted-foreground">
            Sign in to access your medical consultations
          </p>
        </div>

        <div className="glass-card p-6 rounded-lg animate-fade-in-scale" style={{ animationDelay: '0.1s' }}>
          <SignIn
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
            path="/sign-in"
            redirectUrl="/dashboard"
            signUpUrl="/sign-up"
          />
        </div>

        <div className="text-center mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-sm text-muted-foreground">
            Secure authentication powered by industry-leading security
          </p>
        </div>
      </div>
    </div>
  );
}
