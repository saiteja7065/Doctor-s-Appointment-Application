import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import securityMiddleware, { shouldSkipSecurityCheck } from '@/middleware/security';

// Check if we're in demo mode
function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/appointments(.*)',
  '/profile(.*)',
  '/doctor(.*)',
  '/admin(.*)',
  '/api/protected(.*)',
]);

// Define admin routes that require additional security
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
  '/admin-setup(.*)',
]);

export default function middleware(req: NextRequest) {
  // In demo mode, bypass Clerk middleware to avoid key validation errors
  if (isDemoMode()) {
    console.log('🧪 Demo mode: Bypassing Clerk middleware for', req.nextUrl.pathname);

    // Apply security middleware first (unless path should be skipped)
    if (!shouldSkipSecurityCheck(req.nextUrl.pathname)) {
      return securityMiddleware(req);
    }

    // Continue with the request in demo mode
    return NextResponse.next();
  }

  // Use Clerk middleware in production mode
  return clerkMiddleware(async (auth, req: NextRequest) => {
    // Apply security middleware first (unless path should be skipped)
    if (!shouldSkipSecurityCheck(req.nextUrl.pathname)) {
      const securityResponse = await securityMiddleware(req);

      // If security middleware returns a response (blocked/error), return it
      if (securityResponse.status !== 200) {
        return securityResponse;
      }
    }

    // Protect routes that require authentication
    if (isProtectedRoute(req)) {
      const { userId } = await auth();
      if (!userId) {
        // Allow the request to continue to Clerk's built-in redirects
        return;
      }

      // Additional security for admin routes
      if (isAdminRoute(req)) {
        // Check if user has admin role (this would be implemented based on your user model)
        // For now, we'll let the route handler check the role
        // You could add additional IP restrictions or other admin-specific security here
      }
    }

    // Continue with the request
    return NextResponse.next();
  })(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
