'use client';

// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen medical-gradient p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Stethoscope className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">MedMe Test Page</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Application Status Check
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Working Features</span>
                </CardTitle>
                <CardDescription>
                  Components and features that are functioning correctly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Next.js Application</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Tailwind CSS Styling</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>shadcn/ui Components</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Framer Motion Animations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Medical Theme Design</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Responsive Layout</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span>Requires Setup</span>
                </CardTitle>
                <CardDescription>
                  Features that need configuration to work properly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>MongoDB Database Connection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Clerk Authentication Keys</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>User Registration & Login</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Profile Management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>Dashboard Features</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Test different parts of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <span>Home Page</span>
                  <span className="text-xs opacity-75">Landing page</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/sign-in'}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <span>Sign In</span>
                  <span className="text-xs opacity-75">Authentication</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                  <span>Dashboard</span>
                  <span className="text-xs opacity-75">Protected route</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-sm text-muted-foreground">
            MedMe Application • Built with Next.js, TypeScript, and MongoDB
          </p>
        </div>
      </div>
    </div>
  );
}
