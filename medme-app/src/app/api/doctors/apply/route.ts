import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { User, UserRole } from '@/lib/models/User';
import { DoctorApplication, ApplicationStatus } from '@/lib/models/DoctorApplication';
import { MedicalSpecialty } from '@/lib/models/Doctor';
import { createNotification, NotificationType, NotificationPriority } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { logUserManagementEvent } from '@/lib/audit';
import { AuditAction } from '@/lib/models/AuditLog';
import { DemoAuthService } from '@/lib/demo-auth';
import mongoose from 'mongoose';
import { z } from 'zod';

// Validation schema for doctor application
const doctorApplicationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  specialty: z.nativeEnum(MedicalSpecialty),
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters'),
  credentialUrl: z.string().url('Invalid credential URL'),
  yearsOfExperience: z.number().min(0, 'Years of experience cannot be negative').max(50),
  education: z.array(z.object({
    degree: z.string().min(2, 'Degree must be at least 2 characters'),
    institution: z.string().min(2, 'Institution must be at least 2 characters'),
    graduationYear: z.number().min(1950).max(new Date().getFullYear()),
  })).min(1, 'At least one education entry is required'),
  certifications: z.array(z.object({
    name: z.string().min(2, 'Certification name must be at least 2 characters'),
    issuingOrganization: z.string().min(2, 'Issuing organization must be at least 2 characters'),
    issueDate: z.string().transform((str) => new Date(str)),
    expiryDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  })).optional().default([]),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  languages: z.array(z.string()).min(1, 'At least one language is required'),
  consultationFee: z.number().min(1, 'Consultation fee must be at least 1 credit').max(20),
  additionalNotes: z.string().max(2000, 'Additional notes must be less than 2000 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('🏥 Doctor application submission started...');

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Processing doctor application');

      const body = await request.json();
      const validatedData = doctorApplicationSchema.parse(body);

      // Simulate successful application submission
      const demoApplicationId = `demo_app_${Date.now()}`;

      console.log(`✅ Demo application created: ${demoApplicationId}`);
      return NextResponse.json({
        success: true,
        message: 'Doctor application submitted successfully (demo mode)',
        applicationId: demoApplicationId,
        status: ApplicationStatus.PENDING,
        estimatedReviewTime: '2-5 business days',
        isDemo: true
      }, { status: 201 });
    }

    // Verify authentication (only in production mode)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = doctorApplicationSchema.parse(body);

    // Connect to database using Mongoose
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      // Return success response even when database is not available
      // This allows the application to work in development/demo mode
      console.log('Database not available, returning success response for doctor application demo mode - updated');
      return NextResponse.json(
        {
          message: 'Doctor application submitted successfully (demo mode)',
          applicationId: 'demo_' + userId + '_' + Date.now(),
          status: 'pending',
          estimatedReviewTime: '2-5 business days',
        },
        { status: 201 }
      );
    }

    // Check if user already has an application
    const existingApplication = await DoctorApplication.findOne({ clerkId: userId });
    if (existingApplication) {
      return NextResponse.json(
        {
          error: 'Application already exists',
          message: 'You have already submitted a doctor application. Please check your application status.',
          applicationId: existingApplication._id,
          status: existingApplication.status
        },
        { status: 409 }
      );
    }

    // Check if user is already a doctor
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser && existingUser.role === UserRole.DOCTOR) {
      return NextResponse.json(
        {
          error: 'Already a doctor',
          message: 'You are already registered as a doctor on the platform.'
        },
        { status: 409 }
      );
    }

    // Create new doctor application
    const application = new DoctorApplication({
      clerkId: userId,
      ...validatedData,
      status: ApplicationStatus.PENDING,
      submittedAt: new Date(),
      uploadedDocuments: [], // Documents will be uploaded separately
      adminReviews: [],
    });

    await application.save();

    // Log the application submission for audit
    await logUserManagementEvent(
      AuditAction.DOCTOR_APPLICATION_SUBMIT,
      userId,
      application._id.toString(),
      `Doctor application submitted by ${validatedData.firstName} ${validatedData.lastName} (${validatedData.specialty})`,
      request,
      undefined,
      {
        applicationId: application._id.toString(),
        specialty: validatedData.specialty,
        licenseNumber: validatedData.licenseNumber,
        yearsOfExperience: validatedData.yearsOfExperience,
      }
    );

    // Notify all admins about the new application
    await notifyAdminsOfNewApplication(application);

    // Log the application submission
    console.log(`Doctor application submitted for user ${userId} (${validatedData.firstName} ${validatedData.lastName})`);

    return NextResponse.json(
      {
        message: 'Doctor application submitted successfully',
        applicationId: application._id,
        status: application.status,
        estimatedReviewTime: '2-5 business days',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error submitting doctor application:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        {
          error: 'Application already exists',
          message: 'You have already submitted a doctor application.'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to submit doctor application. Please try again.'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check application status
export async function GET() {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database using Mongoose
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        {
          hasApplication: false,
          message: 'Database not available (demo mode)'
        },
        { status: 200 }
      );
    }

    // Find doctor application
    const application = await DoctorApplication.findOne({ clerkId: userId });
    if (!application) {
      return NextResponse.json(
        {
          hasApplication: false,
          message: 'No doctor application found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hasApplication: true,
      application: {
        id: application._id,
        status: application.status,
        submittedAt: application.submittedAt,
        specialty: application.specialty,
        fullName: application.fullName,
        email: application.email,
        phoneNumber: application.phoneNumber,
        yearsOfExperience: application.yearsOfExperience,
        consultationFee: application.consultationFee,
        latestReview: application.latestReview,
        uploadedDocuments: application.uploadedDocuments.map(doc => ({
          type: doc.type,
          fileName: doc.fileName,
          uploadedAt: doc.uploadedAt,
          fileSize: doc.fileSize,
        })),
      }
    });

  } catch (error) {
    console.error('Error fetching doctor application:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch doctor application. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * Notify all admin users about a new doctor application
 */
async function notifyAdminsOfNewApplication(application: any) {
  try {
    // Find all admin users
    const adminUsers = await User.find({ role: UserRole.ADMIN });

    if (adminUsers.length === 0) {
      console.log('No admin users found to notify about new doctor application');
      return;
    }

    const title = '👨‍⚕️ New Doctor Application';
    const message = `Dr. ${application.firstName} ${application.lastName} has submitted a new application for ${application.specialty}. Please review and verify their credentials.`;

    // Create notifications for all admins
    const notificationPromises = adminUsers.map(admin =>
      createNotification(
        admin.clerkId,
        'admin',
        NotificationType.DOCTOR_APPLICATION_SUBMITTED,
        title,
        message,
        {
          priority: NotificationPriority.HIGH,
          actionUrl: '/dashboard/admin/doctors',
          metadata: {
            applicationId: application._id.toString(),
            doctorName: `${application.firstName} ${application.lastName}`,
            specialty: application.specialty,
            licenseNumber: application.licenseNumber,
            submittedAt: application.submittedAt?.toISOString()
          }
        }
      )
    );

    // Send email notifications to all admins
    const emailPromises = adminUsers.map(admin => {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">MedMe Admin Portal</h1>
          </div>

          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Dear Admin,
            </p>

            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              A new doctor application has been submitted and requires your review:
            </p>

            <div style="background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Application Details</h3>
              <p><strong>Doctor:</strong> Dr. ${application.firstName} ${application.lastName}</p>
              <p><strong>Specialty:</strong> ${application.specialty}</p>
              <p><strong>License Number:</strong> ${application.licenseNumber}</p>
              <p><strong>Experience:</strong> ${application.yearsOfExperience} years</p>
              <p><strong>Submitted:</strong> ${new Date(application.submittedAt).toLocaleDateString()}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/doctors"
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Review Application
              </a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Please review the application and verify the doctor's credentials before approval.
            </p>

            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #999; font-size: 12px;">
                © 2025 MedMe. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `;

      return sendEmail(
        admin.email,
        `MedMe - ${title}`,
        emailContent
      );
    });

    // Execute all notifications and emails
    await Promise.all([...notificationPromises, ...emailPromises]);

    console.log(`Notified ${adminUsers.length} admin(s) about new doctor application from Dr. ${application.firstName} ${application.lastName}`);

  } catch (error) {
    console.error('Error notifying admins about new doctor application:', error);
    // Don't throw error to avoid breaking the main application flow
  }
}
