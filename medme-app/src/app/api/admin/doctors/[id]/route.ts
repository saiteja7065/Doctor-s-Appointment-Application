import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserStatus } from '@/lib/models/User';
import { Doctor, DoctorVerificationStatus } from '@/lib/models/Doctor';

async function handler(userContext: any, request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doctorId = params.id;
    const { status, reason } = await request.json();

    // Validate status
    const validStatuses = Object.values(DoctorVerificationStatus);
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
      console.log('Database not available, returning success response for doctor status update demo mode');
      return NextResponse.json(
        {
          message: `Doctor application ${status} successfully (demo mode)`,
          applicationId: doctorId,
          status: status,
          reason: reason || '',
          updatedAt: new Date().toISOString()
        },
        { status: 200 }
      );
    }

    // Find the doctor application
    const doctor = await Doctor.findById(doctorId).populate('userId');
    if (!doctor) {
      return NextResponse.json(
        { 
          error: 'Doctor application not found',
          message: 'The specified doctor application does not exist.'
        },
        { status: 404 }
      );
    }

    // Update doctor verification status
    doctor.verificationStatus = status;
    await doctor.save();

    // Update user status based on verification status
    if (doctor.userId) {
      const user = await User.findById(doctor.userId);
      if (user) {
        switch (status) {
          case DoctorVerificationStatus.APPROVED:
            user.status = UserStatus.ACTIVE;
            break;
          case DoctorVerificationStatus.REJECTED:
            user.status = UserStatus.INACTIVE;
            break;
          case DoctorVerificationStatus.SUSPENDED:
            user.status = UserStatus.SUSPENDED;
            break;
          case DoctorVerificationStatus.PENDING:
            user.status = UserStatus.PENDING_VERIFICATION;
            break;
        }
        await user.save();
      }
    }

    // Log the status change
    console.log(`Doctor application ${doctorId} status updated to ${status} by admin ${userContext.clerkId}`);
    if (reason) {
      console.log(`Reason: ${reason}`);
    }

    // TODO: Send notification email to doctor about status change
    // This would be implemented with the notification system

    return NextResponse.json(
      {
        message: `Doctor application ${status} successfully`,
        applicationId: doctorId,
        status: status,
        reason: reason || '',
        updatedAt: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating doctor application status:', error);
    
    // Handle specific MongoDB errors
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { 
          error: 'Invalid application ID',
          message: 'The provided application ID is not valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to update doctor application status'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch individual doctor application details
async function getHandler(userContext: any, request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doctorId = params.id;

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Find the doctor application with user details
    const doctor = await Doctor.findById(doctorId)
      .populate('userId', 'firstName lastName email')
      .lean();

    if (!doctor) {
      return NextResponse.json(
        { 
          error: 'Doctor application not found',
          message: 'The specified doctor application does not exist.'
        },
        { status: 404 }
      );
    }

    // Format response
    const applicationDetails = {
      _id: doctor._id.toString(),
      clerkId: doctor.clerkId,
      firstName: doctor.userId?.firstName || 'Unknown',
      lastName: doctor.userId?.lastName || 'User',
      email: doctor.userId?.email || 'unknown@email.com',
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber,
      credentialUrl: doctor.credentialUrl,
      yearsOfExperience: doctor.yearsOfExperience,
      education: doctor.education || [],
      certifications: doctor.certifications || [],
      bio: doctor.bio || '',
      languages: doctor.languages || ['English'],
      verificationStatus: doctor.verificationStatus,
      consultationFee: doctor.consultationFee,
      totalEarnings: doctor.totalEarnings,
      totalConsultations: doctor.totalConsultations,
      averageRating: doctor.averageRating,
      submittedAt: doctor.createdAt?.toISOString() || new Date().toISOString(),
      lastUpdated: doctor.updatedAt?.toISOString() || new Date().toISOString()
    };

    return NextResponse.json(
      {
        application: applicationDetails,
        message: 'Doctor application details fetched successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching doctor application details:', error);
    
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { 
          error: 'Invalid application ID',
          message: 'The provided application ID is not valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch doctor application details'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);
export const PATCH = withAdminAuth(handler);
