import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import securityMiddleware, { shouldSkipSecurityCheck } from '@/middleware/security';

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

export default clerkMiddleware(async (auth, req: NextRequest) => {
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
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
