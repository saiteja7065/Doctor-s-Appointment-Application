import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserStatus } from '@/lib/models/User';
import { Doctor, DoctorVerificationStatus } from '@/lib/models/Doctor';
import { logAdminAction } from '@/lib/audit';
import { AuditAction } from '@/lib/models/AuditLog';
import { createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';

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

    // Store previous status for audit logging
    const previousStatus = doctor.verificationStatus;

    // Update doctor verification status
    doctor.verificationStatus = status;
    await doctor.save();

    // Update user status based on verification status
    let userStatusChanged = false;
    let previousUserStatus = null;
    if (doctor.userId) {
      const user = await User.findById(doctor.userId);
      if (user) {
        previousUserStatus = user.status;
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
        userStatusChanged = previousUserStatus !== user.status;
        await user.save();
      }
    }

    // Log the admin action for audit trail
    const auditAction = status === DoctorVerificationStatus.APPROVED ? AuditAction.ADMIN_DOCTOR_APPROVE :
                       status === DoctorVerificationStatus.REJECTED ? AuditAction.ADMIN_DOCTOR_REJECT :
                       status === DoctorVerificationStatus.SUSPENDED ? AuditAction.ADMIN_DOCTOR_SUSPEND :
                       AuditAction.DOCTOR_VERIFICATION_UPDATE;

    await logAdminAction(
      auditAction,
      userContext.clerkId,
      doctorId,
      'doctor_application',
      `Admin ${status} doctor application for Dr. ${doctor.firstName} ${doctor.lastName}${reason ? ` - Reason: ${reason}` : ''}`,
      request,
      {
        verificationStatus: previousStatus,
        userStatus: previousUserStatus,
      },
      {
        verificationStatus: status,
        userStatus: userStatusChanged ? (await User.findById(doctor.userId))?.status : previousUserStatus,
        reason: reason || null,
      }
    );

    // Log the status change (keeping existing console log for backward compatibility)
    console.log(`Doctor application ${doctorId} status updated to ${status} by admin ${userContext.clerkId}`);
    if (reason) {
      console.log(`Reason: ${reason}`);
    }

    // Send notification email and in-app notification to doctor about status change
    await sendDoctorStatusNotification(doctor, status, reason);

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

// Helper function to send doctor status notification
async function sendDoctorStatusNotification(doctor: any, status: string, reason?: string) {
  try {
    const user = doctor.userId;
    if (!user) return;

    // Determine notification content based on status
    let title = '';
    let message = '';
    let priority = NotificationPriority.MEDIUM;
    let notificationType = NotificationType.VERIFICATION_STATUS;

    switch (status) {
      case DoctorVerificationStatus.APPROVED:
        title = '🎉 Application Approved!';
        message = `Congratulations! Your doctor application has been approved. You can now start accepting appointments and consultations.`;
        priority = NotificationPriority.HIGH;
        break;
      case DoctorVerificationStatus.REJECTED:
        title = '❌ Application Rejected';
        message = `Unfortunately, your doctor application has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`;
        priority = NotificationPriority.HIGH;
        break;
      case DoctorVerificationStatus.SUSPENDED:
        title = '⚠️ Account Suspended';
        message = `Your doctor account has been suspended. ${reason ? `Reason: ${reason}` : 'Please contact support for assistance.'}`;
        priority = NotificationPriority.URGENT;
        break;
      case DoctorVerificationStatus.PENDING:
        title = '📋 Application Under Review';
        message = 'Your doctor application is currently under review. We will notify you once the verification process is complete.';
        priority = NotificationPriority.MEDIUM;
        break;
      default:
        title = 'Application Status Updated';
        message = `Your doctor application status has been updated to: ${status}`;
    }

    // Create in-app notification
    await createNotification(
      doctor.clerkId,
      'doctor',
      notificationType,
      title,
      message,
      {
        priority,
        metadata: {
          applicationId: doctor._id.toString(),
          verificationStatus: status,
          reason: reason || null,
        }
      }
    );

    // Send email notification
    const emailSubject = `MedMe - ${title}`;
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe Doctor Portal</h1>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Dear Dr. ${user.firstName} ${user.lastName},
          </p>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            ${message}
          </p>

          ${reason ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Additional Information:</strong><br>
              ${reason}
            </div>
          ` : ''}

          ${status === DoctorVerificationStatus.APPROVED ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/doctor"
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
          ` : ''}

          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>

          <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              © 2025 MedMe. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    await sendEmail(
      user.email,
      emailSubject,
      emailContent
    );

    console.log(`Notification sent to doctor ${doctor.clerkId} for status: ${status}`);
  } catch (error) {
    console.error('Error sending doctor status notification:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

export const GET = withAdminAuth(getHandler);
export const PATCH = withAdminAuth(handler);
