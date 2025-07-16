import { NextRequest, NextResponse } from 'next/server';

/**
 * Test Clerk Configuration
 * This endpoint helps diagnose Clerk authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // Check if required environment variables are present
    const envCheck = {
      hasPublishableKey: !!clerkPublishableKey,
      hasSecretKey: !!clerkSecretKey,
      hasAppUrl: !!appUrl,
      publishableKeyPrefix: clerkPublishableKey?.substring(0, 10) + '...',
      secretKeyPrefix: clerkSecretKey?.substring(0, 10) + '...',
      appUrl: appUrl,
    };
    
    // Check Clerk URLs
    const clerkUrls = {
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    };
    
    return NextResponse.json({
      status: 'success',
      message: 'Clerk configuration test',
      environment: envCheck,
      urls: clerkUrls,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Clerk test error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to test Clerk configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
