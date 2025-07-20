'use client';

import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function TestAuthPage() {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: authLoaded, userId, sessionId } = useAuth();
  const clerk = useClerk();
  
  const [testResults, setTestResults] = useState<any>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runAuthTests = async () => {
    setIsRunningTests(true);
    const results: any = {};

    try {
      // Test 1: Environment Variables
      results.envVars = {
        publishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        publishableKeyValid: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_'),
        demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      };

      // Test 2: Clerk Service Status
      results.clerkService = {
        loaded: !!clerk,
        userLoaded,
        authLoaded,
        signedIn: isSignedIn,
        userId: userId || null,
        sessionId: sessionId || null,
      };

      // Test 3: Database Connection Test
      try {
        const dbResponse = await fetch('/api/health');
        const dbData = await dbResponse.json();
        results.database = {
          connected: dbResponse.ok,
          status: dbData.status,
          details: dbData.database || {},
        };
      } catch (error) {
        results.database = {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Test 4: API Endpoints Test
      try {
        const apiResponse = await fetch('/api/users');
        results.apiEndpoints = {
          usersApi: apiResponse.ok,
          status: apiResponse.status,
        };
      } catch (error) {
        results.apiEndpoints = {
          usersApi: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Test 5: Google OAuth Test (if signed in)
      if (user && user.externalAccounts) {
        results.googleOAuth = {
          hasGoogleAccount: user.externalAccounts.some(acc => acc.provider === 'oauth_google'),
          externalAccounts: user.externalAccounts.map(acc => acc.provider),
        };
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getStatusIcon = (condition: boolean | undefined) => {
    if (condition === undefined) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return condition ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (condition: boolean | undefined) => {
    if (condition === undefined) return <Badge variant="secondary">Unknown</Badge>;
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? "Pass" : "Fail"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🧪 Authentication Test Suite</h1>
          <p className="text-muted-foreground">
            Comprehensive testing of authentication and core systems
          </p>
        </div>

        {/* Quick Status */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Status Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between">
                <span>Clerk Loaded</span>
                {getStatusIcon(!!clerk)}
              </div>
              <div className="flex items-center justify-between">
                <span>User Loaded</span>
                {getStatusIcon(userLoaded)}
              </div>
              <div className="flex items-center justify-between">
                <span>Signed In</span>
                {getStatusIcon(isSignedIn)}
              </div>
              <div className="flex items-center justify-between">
                <span>Demo Mode</span>
                {getStatusIcon(process.env.NEXT_PUBLIC_DEMO_MODE === 'false')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run Tests Button */}
        <Card>
          <CardHeader>
            <CardTitle>System Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runAuthTests} 
              disabled={isRunningTests}
              className="w-full"
            >
              {isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Comprehensive Tests'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-4">
            {/* Environment Variables */}
            {testResults.envVars && (
              <Card>
                <CardHeader>
                  <CardTitle>Environment Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Publishable Key Present</span>
                      {getStatusBadge(testResults.envVars.publishableKey)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Publishable Key Valid</span>
                      {getStatusBadge(testResults.envVars.publishableKeyValid)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Demo Mode Disabled</span>
                      {getStatusBadge(testResults.envVars.demoMode === 'false')}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>App URL</span>
                      <span className="text-sm text-muted-foreground">{testResults.envVars.appUrl}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clerk Service */}
            {testResults.clerkService && (
              <Card>
                <CardHeader>
                  <CardTitle>Clerk Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Service Loaded</span>
                      {getStatusBadge(testResults.clerkService.loaded)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>User Loaded</span>
                      {getStatusBadge(testResults.clerkService.userLoaded)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auth Loaded</span>
                      {getStatusBadge(testResults.clerkService.authLoaded)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>User Signed In</span>
                      {getStatusBadge(testResults.clerkService.signedIn)}
                    </div>
                    {testResults.clerkService.userId && (
                      <div className="flex items-center justify-between">
                        <span>User ID</span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {testResults.clerkService.userId.substring(0, 20)}...
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Database */}
            {testResults.database && (
              <Card>
                <CardHeader>
                  <CardTitle>Database Connection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Connected</span>
                      {getStatusBadge(testResults.database.connected)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <span className="text-sm text-muted-foreground">{testResults.database.status}</span>
                    </div>
                    {testResults.database.details && (
                      <div className="text-sm text-muted-foreground">
                        <pre>{JSON.stringify(testResults.database.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* API Endpoints */}
            {testResults.apiEndpoints && (
              <Card>
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Users API</span>
                      {getStatusBadge(testResults.apiEndpoints.usersApi)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status Code</span>
                      <span className="text-sm text-muted-foreground">{testResults.apiEndpoints.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Google OAuth */}
            {testResults.googleOAuth && (
              <Card>
                <CardHeader>
                  <CardTitle>Google OAuth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Google Account Connected</span>
                      {getStatusBadge(testResults.googleOAuth.hasGoogleAccount)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>External Accounts</span>
                      <span className="text-sm text-muted-foreground">
                        {testResults.googleOAuth.externalAccounts.join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => window.location.href = '/sign-in'}
                variant="outline"
              >
                Test Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/sign-up'}
                variant="outline"
              >
                Test Sign Up
              </Button>
              <Button 
                onClick={() => window.location.href = '/auth-debug'}
                variant="outline"
              >
                Auth Debug
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
