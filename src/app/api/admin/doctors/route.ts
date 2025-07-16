import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { DoctorApplication, ApplicationStatus } from '@/lib/models/DoctorApplication';
import { Doctor } from '@/lib/models/Doctor';
import { User, UserRole } from '@/lib/models/User';
import { withAdminAuth } from '@/lib/auth/rbac';
import { logUserManagementEvent, AuditAction } from '@/lib/audit';
import { sendEmail, EmailTemplate } from '@/lib/email';

interface DoctorApplicationResponse {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  specialty: string;
  licenseNumber: string;
  credentialUrl: string;
  yearsOfExperience: number;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expiryDate?: string;
  }>;
  uploadedDocuments: Array<{
    type: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    fileSize: number;
    mimeType: string;
  }>;
  bio: string;
  languages: string[];
  consultationFee: number;
  status: string;
  submittedAt: string;
  adminReviews: Array<{
    reviewedBy: string;
    reviewedAt: string;
    status: string;
    comments?: string;
    requestedChanges?: string[];
  }>;
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

async function getDoctorApplications(
  status?: string,
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ applications: DoctorApplicationResponse[]; total: number }> {
  const isConnected = await connectToMongoose();
  
  if (!isConnected) {
    // Return demo data for development
    const demoApplications: DoctorApplicationResponse[] = [
      {
        _id: 'demo_app_1',
        clerkId: 'clerk_demo_1',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phoneNumber: '+1-555-0123',
        specialty: 'cardiology',
        licenseNumber: 'MD123456',
        credentialUrl: 'https://example.com/credentials.pdf',
        yearsOfExperience: 8,
        education: [
          {
            degree: 'MD',
            institution: 'Harvard Medical School',
            graduationYear: 2015
          }
        ],
        certifications: [
          {
            name: 'Board Certified Cardiologist',
            issuingOrganization: 'American Board of Internal Medicine',
            issueDate: '2018-06-15',
            expiryDate: '2028-06-15'
          }
        ],
        uploadedDocuments: [
          {
            type: 'medical_license',
            fileName: 'medical_license.pdf',
            fileUrl: '/demo/medical_license.pdf',
            uploadedAt: '2024-01-15T10:00:00Z',
            fileSize: 1024000,
            mimeType: 'application/pdf'
          }
        ],
        bio: 'Experienced cardiologist with 8 years of practice.',
        languages: ['English', 'Spanish'],
        consultationFee: 3,
        status: 'pending',
        submittedAt: '2024-01-15T10:00:00Z',
        adminReviews: [],
        additionalNotes: '',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        _id: 'demo_app_2',
        clerkId: 'clerk_demo_2',
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        email: 'michael.chen@email.com',
        phoneNumber: '+1-555-0124',
        specialty: 'dermatology',
        licenseNumber: 'MD789012',
        credentialUrl: 'https://example.com/credentials2.pdf',
        yearsOfExperience: 12,
        education: [
          {
            degree: 'MD',
            institution: 'Stanford Medical School',
            graduationYear: 2012
          }
        ],
        certifications: [
          {
            name: 'Board Certified Dermatologist',
            issuingOrganization: 'American Board of Dermatology',
            issueDate: '2016-08-20',
            expiryDate: '2026-08-20'
          }
        ],
        uploadedDocuments: [
          {
            type: 'medical_license',
            fileName: 'license_chen.pdf',
            fileUrl: '/demo/license_chen.pdf',
            uploadedAt: '2024-01-16T14:30:00Z',
            fileSize: 856000,
            mimeType: 'application/pdf'
          }
        ],
        bio: 'Specialized dermatologist with extensive experience in cosmetic procedures.',
        languages: ['English', 'Mandarin'],
        consultationFee: 4,
        status: 'under_review',
        submittedAt: '2024-01-16T14:30:00Z',
        adminReviews: [
          {
            reviewedBy: 'admin_demo',
            reviewedAt: '2024-01-17T09:00:00Z',
            status: 'under_review',
            comments: 'Initial review completed. Credentials look good.',
            requestedChanges: []
          }
        ],
        additionalNotes: 'High-quality application with excellent credentials.',
        createdAt: '2024-01-16T14:30:00Z',
        updatedAt: '2024-01-17T09:00:00Z'
      }
    ];

    // Filter by status if provided
    let filteredApplications = demoApplications;
    if (status && status !== 'all') {
      filteredApplications = demoApplications.filter(app => app.status === status);
    }

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredApplications = filteredApplications.filter(app => 
        app.firstName.toLowerCase().includes(searchLower) ||
        app.lastName.toLowerCase().includes(searchLower) ||
        app.email.toLowerCase().includes(searchLower) ||
        app.specialty.toLowerCase().includes(searchLower) ||
        app.licenseNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedApplications = filteredApplications.slice(startIndex, startIndex + limit);

    return {
      applications: paginatedApplications,
      total: filteredApplications.length
    };
  }

  // Build query for database
  const query: any = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { specialty: { $regex: search, $options: 'i' } },
      { licenseNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  try {
    const applications = await DoctorApplication.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await DoctorApplication.countDocuments(query);

    const formattedApplications: DoctorApplicationResponse[] = applications.map(app => ({
      _id: app._id.toString(),
      clerkId: app.clerkId,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phoneNumber: app.phoneNumber,
      specialty: app.specialty,
      licenseNumber: app.licenseNumber,
      credentialUrl: app.credentialUrl,
      yearsOfExperience: app.yearsOfExperience,
      education: app.education,
      certifications: app.certifications.map(cert => ({
        ...cert,
        issueDate: cert.issueDate.toISOString(),
        expiryDate: cert.expiryDate?.toISOString()
      })),
      uploadedDocuments: app.uploadedDocuments.map(doc => ({
        ...doc,
        uploadedAt: doc.uploadedAt.toISOString()
      })),
      bio: app.bio || '',
      languages: app.languages,
      consultationFee: app.consultationFee,
      status: app.status,
      submittedAt: app.submittedAt.toISOString(),
      adminReviews: app.adminReviews.map(review => ({
        ...review,
        reviewedAt: review.reviewedAt.toISOString()
      })),
      additionalNotes: app.additionalNotes,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString()
    }));

    return {
      applications: formattedApplications,
      total
    };
  } catch (error) {
    console.error('Error fetching doctor applications:', error);
    return { applications: [], total: 0 };
  }
}

// GET /api/admin/doctors - Fetch doctor applications with filtering and pagination
async function handler(userContext: any, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const { applications, total } = await getDoctorApplications(status, page, limit, search);

    // Calculate statistics
    const allApplications = await getDoctorApplications();
    const stats = {
      total: allApplications.total,
      pending: allApplications.applications.filter(app => app.status === ApplicationStatus.PENDING).length,
      approved: allApplications.applications.filter(app => app.status === ApplicationStatus.APPROVED).length,
      rejected: allApplications.applications.filter(app => app.status === ApplicationStatus.REJECTED).length,
      under_review: allApplications.applications.filter(app => app.status === ApplicationStatus.UNDER_REVIEW).length,
      requires_additional_info: allApplications.applications.filter(app => app.status === ApplicationStatus.REQUIRES_ADDITIONAL_INFO).length
    };

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      applications,
      stats,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      message: 'Doctor applications fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error in admin doctors handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);

// POST /api/admin/doctors - Update doctor application status
async function updateHandler(userContext: any, request: NextRequest) {
  try {
    const { userId } = await auth();
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

    const isConnected = await connectToMongoose();

    if (!isConnected) {
      // Demo mode response
      console.log('Database not available, returning demo response for application status update');

      // Send demo email notification
      try {
        const demoEmail = 'demo.doctor@example.com';
        const demoName = 'Dr. Demo Doctor';

        if (action === ApplicationStatus.APPROVED) {
          await sendEmail({
            template: EmailTemplate.DOCTOR_APPLICATION_APPROVED,
            to: demoEmail,
            data: {
              doctorName: demoName,
              loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/doctor`,
              supportEmail: 'support@medme.com'
            }
          });
        } else if (action === ApplicationStatus.REJECTED) {
          await sendEmail({
            template: EmailTemplate.DOCTOR_APPLICATION_REJECTED,
            to: demoEmail,
            data: {
              doctorName: demoName,
              reason: comments || 'Application did not meet our requirements',
              supportEmail: 'support@medme.com'
            }
          });
        }
      } catch (emailError) {
        console.error('Demo email error:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: `Application ${action} successfully (demo mode)`,
        applicationId,
        action,
        comments: comments || '',
        updatedAt: new Date().toISOString()
      });
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
    application.addAdminReview(userId!, action, comments, requestedChanges);
    await application.save();

    // If approved, create doctor profile
    if (action === ApplicationStatus.APPROVED) {
      const existingDoctor = await Doctor.findOne({ clerkId: application.clerkId });

      if (!existingDoctor) {
        const doctor = new Doctor({
          clerkId: application.clerkId,
          userId: application.clerkId, // Will be updated when user profile is created
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phoneNumber: application.phoneNumber,
          specialty: application.specialty,
          licenseNumber: application.licenseNumber,
          yearsOfExperience: application.yearsOfExperience,
          education: application.education,
          certifications: application.certifications,
          bio: application.bio,
          languages: application.languages,
          consultationFee: application.consultationFee,
          verificationStatus: 'verified',
          isActive: true,
          rating: 0,
          totalReviews: 0,
          totalConsultations: 0
        });

        await doctor.save();
      }

      // Update user role to doctor
      await User.findOneAndUpdate(
        { clerkId: application.clerkId },
        { role: UserRole.DOCTOR },
        { upsert: true }
      );
    }

    // Send email notification
    try {
      const user = await fetch(`https://api.clerk.dev/v1/users/${application.clerkId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

      const email = user.email_addresses?.[0]?.email_address || application.email;
      const name = `${application.firstName} ${application.lastName}`;

      if (action === ApplicationStatus.APPROVED) {
        await sendEmail({
          template: EmailTemplate.DOCTOR_APPLICATION_APPROVED,
          to: email,
          data: {
            doctorName: name,
            loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/doctor`,
            supportEmail: 'support@medme.com'
          }
        });
      } else if (action === ApplicationStatus.REJECTED) {
        await sendEmail({
          template: EmailTemplate.DOCTOR_APPLICATION_REJECTED,
          to: email,
          data: {
            doctorName: name,
            reason: comments || 'Application did not meet our requirements',
            supportEmail: 'support@medme.com'
          }
        });
      } else if (action === ApplicationStatus.REQUIRES_ADDITIONAL_INFO) {
        await sendEmail({
          template: EmailTemplate.DOCTOR_APPLICATION_ADDITIONAL_INFO,
          to: email,
          data: {
            doctorName: name,
            requestedChanges: requestedChanges || [],
            comments: comments || '',
            applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/apply-doctor`,
            supportEmail: 'support@medme.com'
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    // Log admin action
    await logUserManagementEvent(
      AuditAction.DOCTOR_APPLICATION_REVIEW,
      userId!,
      applicationId,
      `Doctor application ${action} by admin`,
      request,
      undefined,
      {
        applicationId,
        action,
        comments,
        requestedChanges,
        applicantEmail: application.email
      }
    );

    return NextResponse.json({
      success: true,
      message: `Application ${action} successfully`,
      applicationId,
      action,
      comments: comments || '',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating doctor application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(updateHandler);
