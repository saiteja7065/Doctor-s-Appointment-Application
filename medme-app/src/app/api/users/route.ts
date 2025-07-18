import { NextRequest, NextResponse } from 'next/server';
import { connectToMongoose } from '@/lib/mongodb';
import { User, UserRole, UserStatus, IUser } from '@/lib/models/User';
import { DemoAuthService } from '@/lib/demo-auth';

// GET /api/users - Get all users or search users
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/users - Starting...');

    // Parse query parameters first
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Returning demo users with filters applied');

      let demoUsers = [
        {
          _id: 'demo_patient_1',
          clerkId: 'demo_patient_clerk_1',
          email: 'patient@demo.com',
          firstName: 'Demo',
          lastName: 'Patient',
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          isDemo: true
        },
        {
          _id: 'demo_doctor_1',
          clerkId: 'demo_doctor_clerk_1',
          email: 'doctor@demo.com',
          firstName: 'Demo',
          lastName: 'Doctor',
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          isDemo: true
        },
        {
          _id: 'demo_admin_1',
          clerkId: 'demo_admin_clerk_1',
          email: 'admin@demo.com',
          firstName: 'Demo',
          lastName: 'Admin',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          isDemo: true
        }
      ];

      // Apply filters
      if (role) {
        demoUsers = demoUsers.filter(user => user.role === role);
      }
      if (status) {
        demoUsers = demoUsers.filter(user => user.status === status);
      }
      if (search) {
        const searchTerm = search.toLowerCase();
        demoUsers = demoUsers.filter(user =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        );
      }

      // Apply pagination
      const paginatedUsers = demoUsers.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        users: paginatedUsers,
        total: demoUsers.length,
        limit,
        skip,
        message: 'Demo users returned with filters applied'
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

    // Query parameters already parsed above

    // Build query
    const query: any = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with timeout
    const users = await Promise.race([
      User.find(query)
        .select('-__v')
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 })
        .lean(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 10000)
      )
    ]) as IUser[];

    const total = await User.countDocuments(query);

    console.log(`✅ Found ${users.length} users`);
    return NextResponse.json({
      success: true,
      users,
      total,
      limit,
      skip
    });

  } catch (error) {
    console.error('❌ GET /api/users failed:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/users - Starting...');
    const body = await request.json();

    // Validate required fields
    const { clerkId, email, firstName, lastName, role } = body;
    if (!clerkId || !email || !firstName || !lastName || !role) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: clerkId, email, firstName, lastName, role'
      }, { status: 400 });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role. Must be: patient, doctor, or admin'
      }, { status: 400 });
    }

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Simulating user creation');
      const demoUser = {
        _id: `demo_${role}_${Date.now()}`,
        clerkId,
        email,
        firstName,
        lastName,
        role,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDemo: true
      };

      return NextResponse.json({
        success: true,
        user: demoUser,
        message: 'Demo user created successfully'
      }, { status: 201 });
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ clerkId }, { email }]
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User already exists with this clerkId or email'
      }, { status: 409 });
    }

    // Create new user
    const userData = {
      clerkId,
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      status: body.status || UserStatus.ACTIVE,
      profileImage: body.profileImage,
      phoneNumber: body.phoneNumber,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined
    };

    const user = new User(userData);
    const savedUser = await user.save();

    console.log(`✅ User created successfully: ${savedUser._id}`);
    return NextResponse.json({
      success: true,
      user: savedUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ POST /api/users failed:', error);
    
    // Handle validation errors
    if ((error as any).name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: (error as any).errors
      }, { status: 400 });
    }

    // Handle duplicate key errors
    if ((error as any).code === 11000) {
      return NextResponse.json({
        success: false,
        error: 'User already exists with this email or clerkId'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// PUT /api/users - Update user (requires user ID in body)
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 PUT /api/users - Starting...');
    const body = await request.json();
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Simulating user update');
      return NextResponse.json({
        success: true,
        user: { _id: userId, ...updates, updatedAt: new Date().toISOString(), isDemo: true },
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
    const updatedUser = await User.findByIdAndUpdate(
      userId,
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
    console.error('❌ PUT /api/users failed:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
