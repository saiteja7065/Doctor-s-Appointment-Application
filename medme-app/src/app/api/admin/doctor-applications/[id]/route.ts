import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { DoctorApplication, ApplicationStatus } from '@/lib/models/DoctorApplication';
import { User, UserRole } from '@/lib/models/User';
import { DemoAuthService } from '@/lib/demo-auth';

/**
 * GET /api/admin/doctor-applications/[id]
 * Get detailed information about a specific doctor application
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const applicationId = params.id;

    // Find the application
    const application = await DoctorApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application._id,
        clerkId: application.clerkId,
        personalInfo: {
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phoneNumber: application.phoneNumber,
        },
        professionalInfo: {
          specialty: application.specialty,
          licenseNumber: application.licenseNumber,
          credentialUrl: application.credentialUrl,
          yearsOfExperience: application.yearsOfExperience,
          consultationFee: application.consultationFee,
          bio: application.bio,
          languages: application.languages,
        },
        education: application.education,
        certifications: application.certifications,
        uploadedDocuments: application.uploadedDocuments.map(doc => ({
          type: doc.type,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          uploadedAt: doc.uploadedAt,
        })),
        status: application.status,
        submittedAt: application.submittedAt,
        additionalNotes: application.additionalNotes,
        adminReviews: application.adminReviews.map(review => ({
          reviewedBy: review.reviewedBy,
          reviewedAt: review.reviewedAt,
          status: review.status,
          comments: review.comments,
          requestedChanges: review.requestedChanges,
        })),
        latestReview: application.latestReview,
      }
    });

  } catch (error) {
    console.error('Error fetching doctor application details:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch application details. Please try again.'
      },
      { status: 500 }
    );
  }
}
