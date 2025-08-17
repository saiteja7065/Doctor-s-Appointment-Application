import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { DoctorApplication } from '@/lib/models/DoctorApplication';
import { withAdminAuth } from '@/lib/auth/rbac';

// GET /api/admin/doctors/[id] - Get detailed doctor application
async function getApplicationHandler(
  userContext: any,
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const applicationId = params.id;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const isConnected = await connectToMongoose();
    
    if (!isConnected) {
      // Demo mode response
      const demoApplication = {
        _id: applicationId,
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
          },
          {
            degree: 'Residency in Cardiology',
            institution: 'Johns Hopkins Hospital',
            graduationYear: 2018
          }
        ],
        certifications: [
          {
            name: 'Board Certified Cardiologist',
            issuingOrganization: 'American Board of Internal Medicine',
            issueDate: '2018-06-15',
            expiryDate: '2028-06-15'
          },
          {
            name: 'Advanced Cardiac Life Support (ACLS)',
            issuingOrganization: 'American Heart Association',
            issueDate: '2023-01-10',
            expiryDate: '2025-01-10'
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
          },
          {
            type: 'degree_certificate',
            fileName: 'md_degree.pdf',
            fileUrl: '/demo/md_degree.pdf',
            uploadedAt: '2024-01-15T10:05:00Z',
            fileSize: 856000,
            mimeType: 'application/pdf'
          },
          {
            type: 'certification',
            fileName: 'board_certification.pdf',
            fileUrl: '/demo/board_certification.pdf',
            uploadedAt: '2024-01-15T10:10:00Z',
            fileSize: 512000,
            mimeType: 'application/pdf'
          }
        ],
        bio: 'Experienced cardiologist with 8 years of practice specializing in interventional cardiology and heart failure management. Committed to providing compassionate, evidence-based care to patients with cardiovascular conditions.',
        languages: ['English', 'Spanish'],
        consultationFee: 3,
        status: 'pending',
        submittedAt: '2024-01-15T10:00:00Z',
        adminReviews: [],
        additionalNotes: '',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };

      return NextResponse.json({
        success: true,
        application: demoApplication,
        message: 'Doctor application details fetched successfully (demo mode)'
      });
    }

    // Find the application in database
    const application = await DoctorApplication.findById(applicationId).lean();
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Format the application data
    const formattedApplication = {
      _id: application._id.toString(),
      clerkId: application.clerkId,
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phoneNumber: application.phoneNumber,
      specialty: application.specialty,
      licenseNumber: application.licenseNumber,
      credentialUrl: application.credentialUrl,
      yearsOfExperience: application.yearsOfExperience,
      education: application.education,
      certifications: application.certifications.map(cert => ({
        ...cert,
        issueDate: cert.issueDate.toISOString(),
        expiryDate: cert.expiryDate?.toISOString()
      })),
      uploadedDocuments: application.uploadedDocuments.map(doc => ({
        ...doc,
        uploadedAt: doc.uploadedAt.toISOString()
      })),
      bio: application.bio || '',
      languages: application.languages,
      consultationFee: application.consultationFee,
      status: application.status,
      submittedAt: application.submittedAt.toISOString(),
      adminReviews: application.adminReviews.map(review => ({
        ...review,
        reviewedAt: review.reviewedAt.toISOString()
      })),
      additionalNotes: application.additionalNotes,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      application: formattedApplication,
      message: 'Doctor application details fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching doctor application details:', error);
    
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getApplicationHandler);
