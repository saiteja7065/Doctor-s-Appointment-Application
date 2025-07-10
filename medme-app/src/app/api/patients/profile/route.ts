import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';

// Connect to MongoDB
async function connectToDatabase() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      clerkId,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      emergencyContact,
      medicalHistory,
      preferences,
    } = body;

    // Validate that the user is updating their own profile
    if (clerkId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Connect to database
    await connectToDatabase();

    // Update user basic information
    const user = await User.findOne({ clerkId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    
    await user.save();

    // Update patient-specific information
    const patient = await Patient.findOne({ clerkId });
    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
    }

    // Update patient fields
    if (emergencyContact) {
      patient.emergencyContact = {
        name: emergencyContact.name || '',
        relationship: emergencyContact.relationship || '',
        phoneNumber: emergencyContact.phoneNumber || '',
      };
    }

    if (medicalHistory) {
      patient.medicalHistory = {
        allergies: medicalHistory.allergies || [],
        medications: medicalHistory.medications || [],
        conditions: medicalHistory.conditions || [],
        notes: medicalHistory.notes || '',
      };
    }

    if (preferences) {
      patient.preferences = {
        preferredLanguage: preferences.preferredLanguage || 'en',
        timeZone: preferences.timeZone || 'UTC',
        notificationSettings: {
          email: preferences.notificationSettings?.email ?? true,
          sms: preferences.notificationSettings?.sms ?? false,
          push: preferences.notificationSettings?.push ?? true,
        },
      };
    }

    await patient.save();

    return NextResponse.json(
      { 
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          dateOfBirth: user.dateOfBirth,
        },
        patient: {
          emergencyContact: patient.emergencyContact,
          medicalHistory: patient.medicalHistory,
          preferences: patient.preferences,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating patient profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    // Get user and patient data
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const patient = await Patient.findOne({ clerkId: userId });
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
