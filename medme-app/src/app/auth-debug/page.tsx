'use client';

import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Key, 
  Globe,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function AuthDebugPage() {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: authLoaded, userId, sessionId, getToken } = useAuth();
  const clerk = useClerk();
  
  const [clerkStatus, setClerkStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [envVars, setEnvVars] = useState<any>({});
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check Clerk initialization
    if (clerk) {
      setClerkStatus('ready');
    } else {
      setTimeout(() => {
        if (!clerk) {
          setClerkStatus('error');
        }
      }, 5000);
    }

    // Get environment variables (only public ones)
    setEnvVars({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
      NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
  }, [clerk]);

  const getAuthToken = async () => {
    try {
      const token = await getToken();
      setAuthToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get token');
    }
  };

  const testGoogleSignIn = () => {
    try {
      clerk?.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/auth-debug',
        redirectUrlComplete: '/dashboard'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🔍 Authentication Debug Center</h1>
          <p className="text-muted-foreground">
            Comprehensive authentication system diagnostics
          </p>
        </div>

        {/* Clerk Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Clerk Service Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <span>Clerk Loaded</span>
                {getStatusIcon(clerkStatus === 'ready')}
              </div>
              <div className="flex items-center justify-between">
                <span>User Loaded</span>
                {getStatusIcon(userLoaded)}
              </div>
              <div className="flex items-center justify-between">
                <span>Auth Loaded</span>
                {getStatusIcon(authLoaded)}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Clerk Status</span>
                <Badge variant={clerkStatus === 'ready' ? 'default' : clerkStatus === 'error' ? 'destructive' : 'secondary'}>
                  {clerkStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>User Signed In</span>
                <Badge variant={isSignedIn ? 'default' : 'secondary'}>
                  {isSignedIn ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>User Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSignedIn && user ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">
                      {user.primaryEmailAddress?.emailAddress || 'No email'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <p className="text-sm text-muted-foreground">{user.username || 'No username'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Session ID</label>
                    <p className="text-sm text-muted-foreground font-mono">{sessionId || 'No session'}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <label className="text-sm font-medium">External Accounts</label>
                  <div className="mt-2">
                    {user.externalAccounts.length > 0 ? (
                      user.externalAccounts.map((account, index) => (
                        <Badge key={index} variant="outline" className="mr-2">
                          {account.provider}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No external accounts connected</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No user signed in</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Environment Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{key}</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(!!value)}
                    <span className="text-sm text-muted-foreground font-mono">
                      {value ? (key.includes('KEY') ? '***' + String(value).slice(-4) : String(value)) : 'Not set'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Authentication Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => window.location.href = '/sign-in'}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Sign In
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/sign-up'}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Sign Up
              </Button>
              
              <Button 
                onClick={testGoogleSignIn}
                disabled={clerkStatus !== 'ready'}
                className="w-full"
              >
                Test Google Sign In
              </Button>
              
              <Button 
                onClick={getAuthToken}
                disabled={!isSignedIn}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Get Auth Token
              </Button>
            </div>
            
            {authToken && (
              <div className="mt-4">
                <label className="text-sm font-medium">Auth Token</label>
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-1">
                  {authToken.substring(0, 50)}...
                </p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={() => clerk?.signOut()}
                disabled={!isSignedIn}
                variant="outline"
                className="w-full"
              >
                Sign Out
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
