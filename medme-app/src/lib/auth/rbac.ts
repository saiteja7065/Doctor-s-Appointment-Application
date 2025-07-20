import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { connectToMongoose } from '@/lib/mongodb';
import User, { UserRole } from '@/lib/models/User';
import { createAuditLog } from '@/lib/audit';

// Interface for role-based access control options
interface RBACOptions {
  allowedRoles: UserRole[];
  demoModeEnabled?: boolean;
}

// Function to check if demo mode is enabled
function isDemoMode(req: NextRequest): boolean {
  return req.headers.get('X-Demo-Mode') === 'true';
}

// Middleware to check if user has required role
export async function checkUserRole(
  req: NextRequest,
  { allowedRoles, demoModeEnabled = true }: RBACOptions
): Promise<{ 
  authorized: boolean; 
  user?: any; 
  demoMode: boolean;
  error?: string;
}> {
  // Check if demo mode is enabled
  const demoMode = isDemoMode(req);
  
  // If demo mode is enabled and allowed, authorize the request
  if (demoMode && demoModeEnabled) {
    return { authorized: true, demoMode: true };
  }
  
  // Get user from Clerk
  const { userId } = auth();
  
  if (!userId) {
    return { 
      authorized: false, 
      demoMode: false,
      error: 'Unauthorized: User not authenticated' 
    };
  }
  
  // Connect to MongoDB
  const connected = await connectToMongoose();
  if (!connected) {
    return { 
      authorized: false, 
      demoMode: false,
      error: 'Database connection error' 
    };
  }
  
  try {
    // Find user in database
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return { 
        authorized: false, 
        demoMode: false,
        error: 'Unauthorized: User not found in database' 
      };
    }
    
    // Check if user has required role
    const hasRequiredRole = allowedRoles.includes(user.role);
    
    if (!hasRequiredRole) {
      // Log unauthorized access attempt
      await createAuditLog({
        action: 'unauthorized.access',
        entityId: user._id.toString(),
        entityType: 'user',
        data: { 
          userId: user._id.toString(),
          requiredRoles: allowedRoles,
          userRole: user.role
        },
      });
      
      return { 
        authorized: false, 
        user,
        demoMode: false,
        error: `Unauthorized: Required role(s): ${allowedRoles.join(', ')}` 
      };
    }
    
    return { authorized: true, user, demoMode: false };
  } catch (error) {
    console.error('Error checking user role:', error);
    return { 
      authorized: false, 
      demoMode: false,
      error: 'Error checking user role' 
    };
  }
}

// Middleware to protect routes based on user role
export async function rbacMiddleware(
  req: NextRequest,
  options: RBACOptions
): Promise<NextResponse | null> {
  const { authorized, error, demoMode } = await checkUserRole(req, options);
  
  if (!authorized) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // If authorized, return null to continue to the route handler
  return null;
}

// Helper function to protect API routes
export function withRBAC(handler: Function, options: RBACOptions) {
  return async function(req: NextRequest) {
    const middlewareResponse = await rbacMiddleware(req, options);
    
    if (middlewareResponse) {
      return middlewareResponse;
    }
    
    return handler(req);
  };
}

// Helper function to get current user from database
export async function getCurrentUser() {
  const { userId } = auth();
  
  if (!userId) {
    return null;
  }
  
  // Connect to MongoDB
  const connected = await connectToMongoose();
  if (!connected) {
    return null;
  }
  
  try {
    // Find user in database
    const user = await User.findOne({ clerkId: userId });
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}