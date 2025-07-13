import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToMongoose } from '@/lib/mongodb';
import { User, UserRole, UserStatus } from '@/lib/models/User';
import { Doctor, DoctorVerificationStatus, MedicalSpecialty } from '@/lib/models/Doctor';

const demoApplications = [
  {
    clerkId: 'demo_doctor_1',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@medme.com',
    specialty: MedicalSpecialty.CARDIOLOGY,
    licenseNumber: 'MD-12345-CA',
    credentialUrl: 'https://medical-board.ca.gov/verify/MD-12345-CA',
    yearsOfExperience: 8,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Stanford University School of Medicine',
        graduationYear: 2015
      },
      {
        degree: 'Bachelor of Science in Biology',
        institution: 'University of California, Berkeley',
        graduationYear: 2011
      }
    ],
    certifications: [
      {
        name: 'Board Certified in Cardiology',
        issuingOrganization: 'American Board of Internal Medicine',
        issueDate: '2018-06-15',
        expiryDate: '2028-06-15'
      }
    ],
    bio: 'Experienced cardiologist specializing in preventive cardiology and heart disease management.',
    languages: ['English', 'Spanish'],
    consultationFee: 4,
    timeZone: 'America/Los_Angeles'
  },
  {
    clerkId: 'demo_doctor_2',
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    email: 'michael.chen@medme.com',
    specialty: MedicalSpecialty.DERMATOLOGY,
    licenseNumber: 'MD-67890-NY',
    credentialUrl: 'https://health.ny.gov/verify/MD-67890-NY',
    yearsOfExperience: 12,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Harvard Medical School',
        graduationYear: 2012
      }
    ],
    certifications: [
      {
        name: 'Board Certified in Dermatology',
        issuingOrganization: 'American Board of Dermatology',
        issueDate: '2016-08-20',
        expiryDate: '2026-08-20'
      }
    ],
    bio: 'Dermatologist with expertise in skin cancer detection and cosmetic dermatology.',
    languages: ['English', 'Mandarin'],
    consultationFee: 3,
    timeZone: 'America/New_York'
  },
  {
    clerkId: 'demo_doctor_3',
    firstName: 'Dr. Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@medme.com',
    specialty: MedicalSpecialty.PEDIATRICS,
    licenseNumber: 'MD-11111-TX',
    credentialUrl: 'https://tmb.state.tx.us/verify/MD-11111-TX',
    yearsOfExperience: 6,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Baylor College of Medicine',
        graduationYear: 2018
      }
    ],
    certifications: [
      {
        name: 'Board Certified in Pediatrics',
        issuingOrganization: 'American Board of Pediatrics',
        issueDate: '2021-07-10',
        expiryDate: '2031-07-10'
      }
    ],
    bio: 'Pediatrician focused on child development and preventive care.',
    languages: ['English', 'Spanish'],
    consultationFee: 3,
    timeZone: 'America/Chicago'
  }
];

async function handler(userContext: any, request: NextRequest) {
  try {
    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: 'Database not available',
          message: 'Cannot create demo data without database connection'
        },
        { status: 503 }
      );
    }

    const createdApplications = [];

    for (const app of demoApplications) {
      // Check if user already exists
      let user = await User.findOne({ clerkId: app.clerkId });
      
      if (!user) {
        // Create user record
        user = new User({
          clerkId: app.clerkId,
          email: app.email,
          firstName: app.firstName,
          lastName: app.lastName,
          role: UserRole.DOCTOR,
          status: UserStatus.PENDING_VERIFICATION
        });
        await user.save();
      }

      // Check if doctor application already exists
      let doctor = await Doctor.findOne({ clerkId: app.clerkId });
      
      if (!doctor) {
        // Create doctor application
        doctor = new Doctor({
          userId: user._id,
          clerkId: app.clerkId,
          verificationStatus: DoctorVerificationStatus.PENDING,
          specialty: app.specialty,
          licenseNumber: app.licenseNumber,
          credentialUrl: app.credentialUrl,
          yearsOfExperience: app.yearsOfExperience,
          education: app.education,
          certifications: app.certifications,
          bio: app.bio,
          languages: app.languages,
          consultationFee: app.consultationFee,
          timeZone: app.timeZone,
          availability: []
        });
        await doctor.save();
        
        createdApplications.push({
          id: doctor._id.toString(),
          name: `${app.firstName} ${app.lastName}`,
          email: app.email,
          specialty: app.specialty
        });
      }
    }

    return NextResponse.json(
      {
        message: 'Demo doctor applications created successfully',
        created: createdApplications.length,
        applications: createdApplications
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating demo applications:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to create demo applications'
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(handler);
