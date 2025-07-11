import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserStatus, UserRole } from '@/lib/models/User';
import { Patient } from '@/lib/models/Patient';
import { Doctor } from '@/lib/models/Doctor';

async function handler(userContext: any, request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const { status, reason } = await request.json();

    // Validate status
    const validStatuses = Object.values(UserStatus);
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for user status update demo mode');
      return NextResponse.json(
        {
          message: `User account ${status} successfully (demo mode)`,
          userId: userId,
          status: status,
          reason: reason || '',
          updatedAt: new Date().toISOString()
        },
        { status: 200 }
      );
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          message: 'The specified user does not exist.'
        },
        { status: 404 }
      );
    }

    // Prevent admins from being suspended by other admins
    if (user.role === UserRole.ADMIN && status === UserStatus.SUSPENDED) {
      return NextResponse.json(
        { 
          error: 'Cannot suspend admin',
          message: 'Administrator accounts cannot be suspended.'
        },
        { status: 403 }
      );
    }

    // Prevent self-suspension
    if (user.clerkId === userContext.clerkId && status === UserStatus.SUSPENDED) {
      return NextResponse.json(
        { 
          error: 'Cannot suspend self',
          message: 'You cannot suspend your own account.'
        },
        { status: 403 }
      );
    }

    // Update user status
    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Log the status change
    console.log(`User ${userId} status updated from ${oldStatus} to ${status} by admin ${userContext.clerkId}`);
    if (reason) {
      console.log(`Reason: ${reason}`);
    }

    // Handle role-specific status updates
    if (user.role === UserRole.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: user._id });
      if (doctor) {
        // Update doctor verification status based on user status
        switch (status) {
          case UserStatus.SUSPENDED:
            doctor.verificationStatus = 'suspended';
            break;
          case UserStatus.ACTIVE:
            // Only set to approved if it was previously suspended
            if (doctor.verificationStatus === 'suspended') {
              doctor.verificationStatus = 'approved';
            }
            break;
          case UserStatus.INACTIVE:
            // Keep current verification status but mark as inactive
            break;
        }
        await doctor.save();
      }
    }

    // TODO: Send notification email to user about status change
    // This would be implemented with the notification system

    // TODO: If suspending, also handle:
    // - Cancel active appointments
    // - Disable access to platform features
    // - Log security event

    return NextResponse.json(
      {
        message: `User account ${status} successfully`,
        userId: userId,
        status: status,
        previousStatus: oldStatus,
        reason: reason || '',
        updatedAt: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating user status:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID',
          message: 'The provided user ID is not valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to update user status'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch individual user account details
async function getHandler(userContext: any, request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Find the user
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          message: 'The specified user does not exist.'
        },
        { status: 404 }
      );
    }

    // Build user account details
    const userAccount: any = {
      _id: user._id.toString(),
      clerkId: user.clerkId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth?.toISOString(),
      profileImage: user.profileImage,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      lastLogin: user.updatedAt?.toISOString()
    };

    // Fetch role-specific data
    if (user.role === UserRole.PATIENT) {
      const patient = await Patient.findOne({ userId: user._id }).lean();
      if (patient) {
        userAccount.patientData = {
          creditBalance: patient.creditBalance,
          subscriptionPlan: patient.subscriptionPlan || 'free',
          subscriptionStatus: patient.subscriptionStatus,
          totalAppointments: patient.totalAppointments,
          totalSpent: patient.totalSpent,
          emergencyContact: patient.emergencyContact,
          medicalHistory: patient.medicalHistory,
          preferences: patient.preferences
        };
      }
    } else if (user.role === UserRole.DOCTOR) {
      const doctor = await Doctor.findOne({ userId: user._id }).lean();
      if (doctor) {
        userAccount.doctorData = {
          specialty: doctor.specialty,
          verificationStatus: doctor.verificationStatus,
          licenseNumber: doctor.licenseNumber,
          credentialUrl: doctor.credentialUrl,
          yearsOfExperience: doctor.yearsOfExperience,
          education: doctor.education,
          certifications: doctor.certifications,
          totalEarnings: doctor.totalEarnings,
          totalConsultations: doctor.totalConsultations,
          averageRating: doctor.averageRating,
          bio: doctor.bio,
          languages: doctor.languages,
          timeZone: doctor.timeZone
        };
      }
    }

    return NextResponse.json(
      {
        user: userAccount,
        message: 'User account details fetched successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching user account details:', error);
    
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID',
          message: 'The provided user ID is not valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch user account details'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);
export const PATCH = withAdminAuth(handler);
