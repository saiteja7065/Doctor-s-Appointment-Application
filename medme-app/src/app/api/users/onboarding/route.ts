import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserRole } from '@/lib/models/User';
import { Patient } from '@/lib/models/Patient';

/**
 * POST /api/users/onboarding
 * Creates a new user with selected role during onboarding
 * Enforces immutable role selection - roles cannot be changed after creation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/users/onboarding - Starting...');

    // Verify authentication
    const { userId } = await auth();
    console.log('👤 User ID from auth:', userId);

    if (!userId) {
      console.log('❌ No user ID - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    console.log('📝 Request body:', body);
    const { role, firstName, lastName, email } = body;

    // Validate required fields with better error messages
    const missingFields = [];
    if (!role) missingFields.push('role');
    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');
    if (!email) missingFields.push('email');

    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      console.log('📝 Received data:', { role, firstName, lastName, email });
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
          received: { role: !!role, firstName: !!firstName, lastName: !!lastName, email: !!email }
        },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: patient, doctor, admin' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning demo onboarding response');
      return NextResponse.json(
        {
          message: 'User role set successfully (demo mode)',
          userId: `demo_${userId}`,
          role: role,
          status: role === UserRole.DOCTOR ? 'pending_verification' : 'active',
          isDemo: true,
        },
        { status: 201 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'User already exists',
          message: `User already has role: ${existingUser.role}. Roles cannot be changed after account creation.`,
          currentRole: existingUser.role,
          currentStatus: existingUser.status
        },
        { status: 409 }
      );
    }

    // Create new user with selected role
    const userData = {
      clerkId: userId,
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role,
      status: role === UserRole.DOCTOR ? 'pending_verification' : 'active',
    };

    const newUser = new User(userData);
    await newUser.save();

    // Create role-specific profile
    if (role === UserRole.PATIENT) {
      // Create patient profile with default values
      const patientData = {
        userId: newUser._id,
        clerkId: userId,
        creditBalance: 2, // Default credits for new patients
        subscriptionPlan: 'free',
        subscriptionStatus: 'inactive',
        totalAppointments: 0,
        totalSpent: 0,
        emergencyContact: {
          name: '',
          relationship: '',
          phoneNumber: '',
        },
        medicalHistory: {
          allergies: [],
          medications: [],
          conditions: [],
          notes: '',
        },
        preferences: {
          preferredLanguage: 'en',
          timeZone: 'UTC',
          notificationSettings: {
            email: true,
            sms: false,
            push: true,
          },
        },
      };

      const newPatient = new Patient(patientData);
      await newPatient.save();
    }

    // Log successful onboarding
    console.log(`User onboarding completed: ${userId} as ${role}`);

    return NextResponse.json(
      {
        message: 'User role set successfully',
        userId: newUser._id,
        role: newUser.role,
        status: newUser.status,
        nextStep: getNextStepForRole(role),
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error during user onboarding:', error);

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { 
            error: 'User already exists',
            message: 'An account with this information already exists.'
          },
          { status: 409 }
        );
      }

      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { 
            error: 'Validation error',
            message: error.message
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/onboarding
 * Check onboarding status for current user
 */
export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json(
        {
          hasCompletedOnboarding: false,
          message: 'Database not available - onboarding required',
        },
        { status: 200 }
      );
    }

    // Check if user exists
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json(
        {
          hasCompletedOnboarding: false,
          message: 'User not found - onboarding required',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasCompletedOnboarding: true,
        role: user.role,
        status: user.status,
        nextStep: getNextStepForRole(user.role, user.status),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to determine next step based on role and status
 */
function getNextStepForRole(role: UserRole, status?: string): string {
  switch (role) {
    case UserRole.PATIENT:
      return '/patient/profile';
    case UserRole.DOCTOR:
      if (status === 'pending_verification' || !status) {
        return '/doctor/apply';
      }
      return '/doctor/dashboard';
    case UserRole.ADMIN:
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
}

/**
 * Helper function to validate role-specific requirements
 */
function validateRoleRequirements(role: UserRole, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (role) {
    case UserRole.DOCTOR:
      // Doctors will need to complete additional verification
      // This is handled in the doctor application process
      break;
    case UserRole.PATIENT:
      // Patients can start immediately
      break;
    case UserRole.ADMIN:
      // Admin role might require special approval
      // For now, we'll allow it but could add restrictions
      break;
    default:
      errors.push('Invalid role specified');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
