import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';
import { connectToMongoose } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clerkId: string }> }
) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clerkId } = await params;

    // Verify that the user is accessing their own profile
    if (clerkId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Connect to database
    const isConnected = await connectToMongoose();

    if (!isConnected) {
      // Return default patient data when database is not available
      console.log('Database not available, returning default patient data for user:', clerkId);
      return NextResponse.json(
        {
          creditBalance: 2,
          subscriptionPlan: 'free',
          subscriptionStatus: 'inactive',
          totalAppointments: 0,
          message: 'Database not configured - using default data'
        },
        { status: 200 }
      );
    }

    // Get user and patient data
    const user = await User.findOne({ clerkId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const patient = await Patient.findOne({ clerkId });
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '',
        address: '', // Add this field to User model if needed
        emergencyContact: patient.emergencyContact || {
          name: '',
          relationship: '',
          phoneNumber: '',
        },
        medicalHistory: patient.medicalHistory || {
          allergies: [],
          medications: [],
          conditions: [],
          notes: '',
        },
        preferences: patient.preferences || {
          preferredLanguage: 'en',
          timeZone: 'UTC',
          notificationSettings: {
            email: true,
            sms: false,
            push: true,
          },
        },
        creditBalance: patient.creditBalance,
        subscriptionPlan: patient.subscriptionPlan,
        subscriptionStatus: patient.subscriptionStatus,
        totalAppointments: patient.totalAppointments,
        totalSpent: patient.totalSpent,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
