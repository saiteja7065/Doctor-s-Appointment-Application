import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/lib/mongodb';
import { User, IUser } from '@/lib/models/User';
import { DemoAuthService } from '@/lib/demo-auth';

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 GET /api/users/${id} - Starting...`);

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Returning demo user');
      return NextResponse.json({
        success: true,
        user: {
          _id: id,
          clerkId: `demo_clerk_${id}`,
          email: `demo_${id}@medme.com`,
          firstName: 'Demo',
          lastName: 'User',
          role: 'patient',
          status: 'active',
          createdAt: new Date().toISOString(),
          isDemo: true
        }
      });
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Find user by ID or clerkId
    const user = await Promise.race([
      User.findOne({
        $or: [
          { _id: id },
          { clerkId: id }
        ]
      }).select('-__v').lean(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
    ]) as IUser | null;

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    console.log(`✅ User found: ${user._id}`);
    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error(`❌ GET /api/users/${params.id} failed:`, error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update specific user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 PUT /api/users/${id} - Starting...`);
    const updates = await request.json();

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Simulating user update');
      return NextResponse.json({
        success: true,
        user: {
          _id: id,
          ...updates,
          updatedAt: new Date().toISOString(),
          isDemo: true
        },
        message: 'Demo user updated successfully'
      });
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Remove fields that shouldn't be updated
    delete updates.clerkId;
    delete updates.role; // Role is immutable
    delete updates._id;
    delete updates.createdAt;

    // Update user
    const updatedUser = await User.findOneAndUpdate(
      {
        $or: [
          { _id: id },
          { clerkId: id }
        ]
      },
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    console.log(`✅ User updated successfully: ${updatedUser._id}`);
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error(`❌ PUT /api/users/${params.id} failed:`, error);
    
    // Handle validation errors
    if ((error as any).name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: (error as any).errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete specific user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 DELETE /api/users/${id} - Starting...`);

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Simulating user deletion');
      return NextResponse.json({
        success: true,
        message: 'Demo user deleted successfully',
        deletedId: id
      });
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Delete user
    const deletedUser = await User.findOneAndDelete({
      $or: [
        { _id: id },
        { clerkId: id }
      ]
    });

    if (!deletedUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    console.log(`✅ User deleted successfully: ${deletedUser._id}`);
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        _id: deletedUser._id,
        email: deletedUser.email,
        fullName: deletedUser.fullName
      }
    });

  } catch (error) {
    console.error(`❌ DELETE /api/users/${params.id} failed:`, error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
