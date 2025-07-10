import { NextRequest, NextResponse } from 'next/server';
import { withPatientAuth, UserContext } from '@/lib/auth/rbac';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';

// PUT handler with RBAC protection
async function handlePUT(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      emergencyContact,
      medicalHistory,
      preferences,
    } = body;

    // Update user basic information (user is already authenticated and verified as patient)
    const user = userContext.user;

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

    await user.save();

    // Update patient-specific information
    const patient = await Patient.findOne({ clerkId: userContext.clerkId });
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

// GET handler with RBAC protection
async function handleGET(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    // Get user and patient data (user is already authenticated and verified as patient)
    const user = userContext.user;

    const patient = await Patient.findOne({ clerkId: userContext.clerkId });
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

// Export handlers with RBAC protection
export const GET = withPatientAuth(handleGET);
export const PUT = withPatientAuth(handlePUT);
