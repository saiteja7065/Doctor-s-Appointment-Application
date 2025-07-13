import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DoctorApplication, ApplicationStatus } from '@/lib/models/DoctorApplication';
import { User, UserRole } from '@/lib/models/User';
import { Doctor } from '@/lib/models/Doctor';
import { logUserManagementEvent } from '@/lib/audit';
import { AuditAction } from '@/lib/models/AuditLog';

/**
 * GET /api/admin/doctor-applications
 * Get all doctor applications for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status && Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
      query.status = status;
    }

    // Get applications with pagination
    const applications = await DoctorApplication.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalApplications = await DoctorApplication.countDocuments(query);
    const totalPages = Math.ceil(totalApplications / limit);

    return NextResponse.json({
      success: true,
      applications: applications.map(app => ({
        id: app._id,
        clerkId: app.clerkId,
        fullName: `${app.firstName} ${app.lastName}`,
        email: app.email,
        phoneNumber: app.phoneNumber,
        specialty: app.specialty,
        licenseNumber: app.licenseNumber,
        yearsOfExperience: app.yearsOfExperience,
        status: app.status,
        submittedAt: app.submittedAt,
        latestReview: app.adminReviews.length > 0 
          ? app.adminReviews[app.adminReviews.length - 1] 
          : null,
        documentsCount: app.uploadedDocuments.length,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalApplications,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.error('Error fetching doctor applications:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch doctor applications. Please try again.'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/doctor-applications
 * Review a doctor application (approve/reject/request changes)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId, action, comments, requestedChanges } = body;

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: 'Application ID and action are required' },
        { status: 400 }
      );
    }

    const validActions = [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.REQUIRES_ADDITIONAL_INFO,
      ApplicationStatus.UNDER_REVIEW
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Find the application
    const application = await DoctorApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Add admin review
    application.addAdminReview(userId, action, comments, requestedChanges);

    // If approved, create doctor profile
    if (action === ApplicationStatus.APPROVED) {
      // Check if doctor profile already exists
      const existingDoctor = await Doctor.findOne({ clerkId: application.clerkId });
      if (!existingDoctor) {
        // Create or update user with doctor role
        let doctorUser = await User.findOne({ clerkId: application.clerkId });
        if (!doctorUser) {
          doctorUser = new User({
            clerkId: application.clerkId,
            email: application.email,
            firstName: application.firstName,
            lastName: application.lastName,
            role: UserRole.DOCTOR,
            status: 'active',
          });
          await doctorUser.save();
        }

        // Create doctor profile
        const doctor = new Doctor({
          userId: doctorUser._id,
          clerkId: application.clerkId,
          verificationStatus: 'verified',
          specialty: application.specialty,
          licenseNumber: application.licenseNumber,
          credentialUrl: application.credentialUrl,
          documentUrls: {
            medicalLicense: application.uploadedDocuments.find(doc => doc.type === 'medical_license')?.fileUrl,
            degreeCertificate: application.uploadedDocuments.find(doc => doc.type === 'degree_certificate')?.fileUrl,
            certifications: application.uploadedDocuments.filter(doc => doc.type === 'certification').map(doc => doc.fileUrl),
            additionalDocuments: application.uploadedDocuments.filter(doc => doc.type === 'additional_document').map(doc => doc.fileUrl),
          },
          yearsOfExperience: application.yearsOfExperience,
          education: application.education,
          certifications: application.certifications,
          bio: application.bio || '',
          languages: application.languages,
          consultationFee: application.consultationFee,
          availability: [], // Will be set up later in dashboard
          totalEarnings: 0,
          totalConsultations: 0,
          averageRating: 0,
          totalRatings: 0,
          isOnline: false,
          lastActiveAt: new Date(),
        });

        await doctor.save();
      }
    }

    await application.save();

    // Log the admin action
    await logUserManagementEvent(
      AuditAction.DOCTOR_APPLICATION_REVIEW,
      userId,
      application._id.toString(),
      `Doctor application ${action} by admin for ${application.firstName} ${application.lastName}`,
      request,
      undefined,
      {
        applicationId: application._id.toString(),
        applicantClerkId: application.clerkId,
        action,
        comments,
        requestedChanges,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Application ${action} successfully`,
      application: {
        id: application._id,
        status: application.status,
        latestReview: application.latestReview,
      }
    });

  } catch (error) {
    console.error('Error reviewing doctor application:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to review application. Please try again.'
      },
      { status: 500 }
    );
  }
}
