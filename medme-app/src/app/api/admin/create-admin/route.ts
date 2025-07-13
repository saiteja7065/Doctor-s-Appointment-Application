import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { User, UserRole, UserStatus } from '@/lib/models/User';

/**
 * POST /api/admin/create-admin
 * Create an admin user (for development/setup purposes)
 * This endpoint should be secured in production
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user details from Clerk
    const { email, firstName, lastName } = await request.json();

    // Connect to database with retry
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: 'Database not available',
          message: 'Cannot create admin user without database connection'
        },
        { status: 503 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser) {
      // If user exists but is not admin, update their role
      if (existingUser.role !== UserRole.ADMIN) {
        // Note: This bypasses the role immutability for admin creation
        await User.findByIdAndUpdate(existingUser._id, {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE
        });
        
        return NextResponse.json(
          {
            message: 'User role updated to admin successfully',
            user: {
              id: existingUser._id.toString(),
              clerkId: userId,
              email: existingUser.email,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
              role: UserRole.ADMIN,
              status: UserStatus.ACTIVE
            }
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { 
            error: 'User already exists as admin',
            message: 'This user is already an administrator.'
          },
          { status: 409 }
        );
      }
    }

    // Create new admin user
    const adminUser = new User({
      clerkId: userId,
      email: email || 'admin@medme.com',
      firstName: firstName || 'Admin',
      lastName: lastName || 'User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    });

    await adminUser.save();

    return NextResponse.json(
      {
        message: 'Admin user created successfully',
        user: {
          id: adminUser._id.toString(),
          clerkId: userId,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to create admin user'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/create-admin
 * Check if current user can become admin (for development)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        {
          canCreateAdmin: false,
          message: 'Database not available'
        },
        { status: 200 }
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({ clerkId: userId });
    
    return NextResponse.json(
      {
        canCreateAdmin: true,
        currentUser: existingUser ? {
          role: existingUser.role,
          status: existingUser.status,
          isAdmin: existingUser.role === UserRole.ADMIN
        } : null,
        message: existingUser 
          ? `Current role: ${existingUser.role}` 
          : 'No user profile found - can create admin'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error checking admin creation status:', error);
    return NextResponse.json(
      { 
        canCreateAdmin: false,
        message: 'Error checking status'
      },
      { status: 500 }
    );
  }
}
