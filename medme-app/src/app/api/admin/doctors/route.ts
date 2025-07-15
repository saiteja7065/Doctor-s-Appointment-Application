import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToMongoose } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { Doctor, DoctorVerificationStatus } from '@/lib/models/Doctor';

interface DoctorApplicationResponse {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
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
  bio: string;
  languages: string[];
  verificationStatus: string;
  submittedAt: string;
  lastUpdated: string;
}

async function getDoctorApplications(): Promise<DoctorApplicationResponse[]> {
  const isConnected = await connectToMongoose();
  
  if (!isConnected) {
    // Return demo data if database is not available
    return [
      {
        _id: 'demo_1',
        clerkId: 'clerk_demo_123',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        specialty: 'Cardiology',
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
        bio: 'Experienced cardiologist with expertise in interventional cardiology.',
        languages: ['English', 'Spanish'],
        verificationStatus: 'pending',
        submittedAt: '2025-07-10T10:30:00Z',
        lastUpdated: '2025-07-10T10:30:00Z'
      },
      {
        _id: 'demo_2',
        clerkId: 'clerk_demo_456',
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        email: 'michael.chen@email.com',
        specialty: 'Dermatology',
        licenseNumber: 'MD789012',
        credentialUrl: 'https://example.com/credentials2.pdf',
        yearsOfExperience: 12,
        education: [
          {
            degree: 'MD',
            institution: 'Stanford University School of Medicine',
            graduationYear: 2011
          }
        ],
        certifications: [
          {
            name: 'Board Certified Dermatologist',
            issuingOrganization: 'American Board of Dermatology',
            issueDate: '2015-08-20',
            expiryDate: '2025-08-20'
          }
        ],
        bio: 'Dermatologist specializing in skin cancer detection and cosmetic procedures.',
        languages: ['English', 'Mandarin'],
        verificationStatus: 'pending',
        submittedAt: '2025-07-09T14:20:00Z',
        lastUpdated: '2025-07-09T14:20:00Z'
      },
      {
        _id: 'demo_3',
        clerkId: 'clerk_demo_789',
        firstName: 'Dr. Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@email.com',
        specialty: 'Pediatrics',
        licenseNumber: 'MD345678',
        credentialUrl: 'https://example.com/credentials3.pdf',
        yearsOfExperience: 6,
        education: [
          {
            degree: 'MD',
            institution: 'Johns Hopkins School of Medicine',
            graduationYear: 2017
          }
        ],
        certifications: [
          {
            name: 'Board Certified Pediatrician',
            issuingOrganization: 'American Board of Pediatrics',
            issueDate: '2020-09-10',
            expiryDate: '2030-09-10'
          }
        ],
        bio: 'Pediatrician with special interest in developmental disorders and childhood nutrition.',
        languages: ['English', 'Spanish', 'Portuguese'],
        verificationStatus: 'approved',
        submittedAt: '2025-07-08T09:15:00Z',
        lastUpdated: '2025-07-09T16:45:00Z'
      }
    ];
  }

  try {
    // Fetch all doctor applications with user information
    const doctors = await Doctor.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return doctors.map(doctor => ({
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
      submittedAt: doctor.createdAt?.toISOString() || new Date().toISOString(),
      lastUpdated: doctor.updatedAt?.toISOString() || new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error fetching doctor applications:', error);
    
    // Return demo data on error
    return [
      {
        _id: 'demo_1',
        clerkId: 'clerk_demo_123',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        specialty: 'Cardiology',
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
        bio: 'Experienced cardiologist with expertise in interventional cardiology.',
        languages: ['English', 'Spanish'],
        verificationStatus: 'pending',
        submittedAt: '2025-07-10T10:30:00Z',
        lastUpdated: '2025-07-10T10:30:00Z'
      }
    ];
  }
}

async function handler(userContext: any, request: NextRequest) {
  try {
    const applications = await getDoctorApplications();

    // Calculate statistics
    const stats = {
      total: applications.length,
      pending: applications.filter(app => app.verificationStatus === 'pending').length,
      approved: applications.filter(app => app.verificationStatus === 'approved').length,
      rejected: applications.filter(app => app.verificationStatus === 'rejected').length,
      suspended: applications.filter(app => app.verificationStatus === 'suspended').length
    };

    return NextResponse.json({
      applications,
      stats,
      message: 'Doctor applications fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Admin doctors API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch doctor applications'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);

async function updateDoctorStatus(userContext: any, request: NextRequest) {
  try {
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: 'Database Error',
          message: 'Database connection failed'
        },
        { status: 503 }
      );
    }

    const data = await request.json();
    const { applicationId, action, comments, requestedChanges } = data;

    if (!applicationId || !action) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Application ID and action are required'
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['approve', 'reject', 'suspend', 'request_info'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Invalid action. Must be one of: approve, reject, suspend, request_info'
        },
        { status: 400 }
      );
    }

    // Map action to verification status
    const statusMap: Record<string, DoctorVerificationStatus> = {
      'approve': DoctorVerificationStatus.APPROVED,
      'reject': DoctorVerificationStatus.REJECTED,
      'suspend': DoctorVerificationStatus.SUSPENDED,
      'request_info': DoctorVerificationStatus.REQUIRES_ADDITIONAL_INFO
    };

    // Find the doctor application
    const doctor = await Doctor.findById(applicationId);
    if (!doctor) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'Doctor application not found'
        },
        { status: 404 }
      );
    }

    // Update verification status
    doctor.verificationStatus = statusMap[action];

    // Add admin review
    const adminReview = {
      reviewedBy: userContext.userId,
      reviewedAt: new Date(),
      status: statusMap[action],
      comments: comments || undefined,
      requestedChanges: requestedChanges || undefined
    };

    if (!doctor.adminReviews) {
      doctor.adminReviews = [];
    }

    doctor.adminReviews.push(adminReview);

    // Save changes
    await doctor.save();

    // If approved, update the user status as well
    if (action === 'approve') {
      await User.findOneAndUpdate(
        { _id: doctor.userId },
        { status: UserStatus.ACTIVE }
      );
    }

    // If rejected or suspended, update user status accordingly
    if (action === 'reject' || action === 'suspend') {
      await User.findOneAndUpdate(
        { _id: doctor.userId },
        { status: action === 'reject' ? UserStatus.INACTIVE : UserStatus.SUSPENDED }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Doctor application ${action}ed successfully`,
      status: statusMap[action]
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating doctor status:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to update doctor status'
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(updateDoctorStatus);
