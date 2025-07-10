import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserRole } from '@/lib/models/User';

// RBAC Error types
export class RBACError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'RBACError';
  }
}

export class AuthenticationError extends RBACError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends RBACError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

// User context interface
export interface UserContext {
  userId: string;
  clerkId: string;
  role: UserRole;
  status: string;
  user: any; // Full user object from database
}

// RBAC configuration interface
export interface RBACConfig {
  requiredRoles: UserRole | UserRole[];
  allowSelf?: boolean; // Allow access to own resources
  requireActiveStatus?: boolean; // Require active user status
  customCheck?: (user: UserContext, request: NextRequest) => Promise<boolean>;
}

/**
 * Authenticate user and get user context
 */
export async function authenticateUser(): Promise<UserContext> {
  const { userId } = await auth();

  if (!userId) {
    throw new AuthenticationError('User not authenticated');
  }

  // Connect to database
  const isConnected = await connectToDatabase();
  if (!isConnected) {
    throw new RBACError('Database connection failed', 503);
  }

  // Get user from database
  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    throw new AuthenticationError('User not found in database');
  }

  return {
    userId: user._id.toString(),
    clerkId: userId,
    role: user.role,
    status: user.status,
    user: user
  };
}

/**
 * Check if user has required role(s)
 */
export function hasRequiredRole(userRole: UserRole, requiredRoles: UserRole | UserRole[]): boolean {
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  }
  return userRole === requiredRoles;
}

/**
 * Check if user can access their own resource
 */
export function canAccessOwnResource(userContext: UserContext, resourceUserId: string): boolean {
  return userContext.userId === resourceUserId || userContext.clerkId === resourceUserId;
}

/**
 * Main RBAC middleware function
 */
export async function withRBAC(
  config: RBACConfig,
  handler: (userContext: UserContext, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Authenticate user
      const userContext = await authenticateUser();

      // Check if user status is active (if required)
      if (config.requireActiveStatus !== false && userContext.status !== 'active') {
        throw new AuthorizationError('Account is not active. Please contact support.');
      }

      // Check role-based access
      if (!hasRequiredRole(userContext.role, config.requiredRoles)) {
        throw new AuthorizationError(
          `Access denied. Required role(s): ${Array.isArray(config.requiredRoles) 
            ? config.requiredRoles.join(', ') 
            : config.requiredRoles}`
        );
      }

      // Run custom authorization check if provided
      if (config.customCheck) {
        const customCheckPassed = await config.customCheck(userContext, request);
        if (!customCheckPassed) {
          throw new AuthorizationError('Custom authorization check failed');
        }
      }

      // Call the actual handler with user context
      return await handler(userContext, request);

    } catch (error) {
      console.error('RBAC Error:', error);

      if (error instanceof RBACError) {
        return NextResponse.json(
          { 
            error: error.name,
            message: error.message,
            statusCode: error.statusCode
          },
          { status: error.statusCode }
        );
      }

      // Handle unexpected errors
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Convenience function for patient-only routes
 */
export function withPatientAuth(
  handler: (userContext: UserContext, request: NextRequest) => Promise<NextResponse>
) {
  return withRBAC(
    { 
      requiredRoles: UserRole.PATIENT,
      requireActiveStatus: true
    },
    handler
  );
}

/**
 * Convenience function for doctor-only routes
 */
export function withDoctorAuth(
  handler: (userContext: UserContext, request: NextRequest) => Promise<NextResponse>
) {
  return withRBAC(
    { 
      requiredRoles: UserRole.DOCTOR,
      requireActiveStatus: false // Doctors can be pending verification
    },
    handler
  );
}

/**
 * Convenience function for admin-only routes
 */
export function withAdminAuth(
  handler: (userContext: UserContext, request: NextRequest) => Promise<NextResponse>
) {
  return withRBAC(
    { 
      requiredRoles: UserRole.ADMIN,
      requireActiveStatus: true
    },
    handler
  );
}

/**
 * Convenience function for routes accessible by multiple roles
 */
export function withMultiRoleAuth(
  roles: UserRole[],
  handler: (userContext: UserContext, request: NextRequest) => Promise<NextResponse>
) {
  return withRBAC(
    { 
      requiredRoles: roles,
      requireActiveStatus: true
    },
    handler
  );
}

/**
 * Utility function to extract resource ID from URL path
 */
export function extractResourceId(request: NextRequest, paramName: string = 'id'): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const paramIndex = pathSegments.findIndex(segment => segment === paramName);
  
  if (paramIndex !== -1 && paramIndex + 1 < pathSegments.length) {
    return pathSegments[paramIndex + 1];
  }
  
  return null;
}

/**
 * Check if user can access resource based on ownership
 */
export async function checkResourceOwnership(
  userContext: UserContext,
  resourceId: string,
  resourceType: 'patient' | 'doctor' | 'appointment'
): Promise<boolean> {
  // Implementation depends on resource type
  switch (resourceType) {
    case 'patient':
      // Check if user is the patient or has admin role
      return userContext.role === UserRole.ADMIN || 
             userContext.clerkId === resourceId ||
             userContext.userId === resourceId;
    
    case 'doctor':
      // Check if user is the doctor or has admin role
      return userContext.role === UserRole.ADMIN || 
             userContext.clerkId === resourceId ||
             userContext.userId === resourceId;
    
    case 'appointment':
      // More complex check - would need to query appointment table
      // For now, return basic check
      return userContext.role === UserRole.ADMIN;
    
    default:
      return false;
  }
}
