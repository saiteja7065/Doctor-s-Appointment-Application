import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { syncUserFromClerk } from '@/lib/services/userSyncService';
import { withRBAC } from '@/lib/auth/rbac';
import { UserRole } from '@/lib/models/User';

async function handler(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Force sync the current user
    const user = await syncUserFromClerk(userId, { forceSync: true });
    
    if (!user) {
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'User synchronized successfully',
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Allow all authenticated users to sync their own data
export const GET = withRBAC(handler, {
  allowedRoles: [UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN],
  demoModeEnabled: true
});