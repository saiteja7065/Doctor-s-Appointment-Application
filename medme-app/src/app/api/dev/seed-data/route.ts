import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/lib/mongodb';
import { User, UserRole, UserStatus } from '@/lib/models/User';
import { Doctor, DoctorVerificationStatus, MedicalSpecialty } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';

// Only allow in development
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});

    // Create demo users
    const demoUsers = [
      {
        clerkId: 'demo_doctor_1',
        email: 'sarah.johnson@medme.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE
      },
      {
        clerkId: 'demo_doctor_2',
        email: 'michael.chen@medme.com',
        firstName: 'Michael',
        lastName: 'Chen',
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE
      },
      {
        clerkId: 'demo_doctor_3',
        email: 'emily.rodriguez@medme.com',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE
      },
      {
        clerkId: 'demo_patient_1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE
      }
    ];

    const createdUsers = await User.insertMany(demoUsers);
    console.log(`Created ${createdUsers.length} demo users`);

    // Create demo doctors
    const demoDoctors = [
      {
        userId: createdUsers[0]._id,
        clerkId: 'demo_doctor_1',
        firstName: 'Sarah',
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
          }
        ],
        certifications: [
          {
            name: 'Board Certified in Cardiology',
            issuingOrganization: 'American Board of Internal Medicine',
            issueDate: new Date('2018-06-15')
          }
        ],
        bio: 'Experienced cardiologist specializing in preventive cardiology and heart disease management.',
        languages: ['English', 'Spanish'],
        consultationFee: 4,
        timeZone: 'America/Los_Angeles',
        verificationStatus: DoctorVerificationStatus.APPROVED,
        rating: 4.8,
        totalRatings: 156,
        totalConsultations: 342,
        isOnline: true,
        availability: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isAvailable: true }
        ]
      },
      {
        userId: createdUsers[1]._id,
        clerkId: 'demo_doctor_2',
        firstName: 'Michael',
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
            issueDate: new Date('2016-08-20')
          }
        ],
        bio: 'Dermatologist with expertise in skin cancer detection and cosmetic dermatology.',
        languages: ['English', 'Mandarin'],
        consultationFee: 3,
        timeZone: 'America/New_York',
        verificationStatus: DoctorVerificationStatus.APPROVED,
        rating: 4.9,
        totalRatings: 203,
        totalConsultations: 567,
        isOnline: false,
        availability: [
          { dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '10:00', endTime: '18:00', isAvailable: true },
          { dayOfWeek: 6, startTime: '09:00', endTime: '12:00', isAvailable: true }
        ]
      },
      {
        userId: createdUsers[2]._id,
        clerkId: 'demo_doctor_3',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@medme.com',
        specialty: MedicalSpecialty.PEDIATRICS,
        licenseNumber: 'MD-11111-TX',
        credentialUrl: 'https://tmb.state.tx.us/verify/MD-11111-TX',
        yearsOfExperience: 6,
        education: [
          {
            degree: 'Doctor of Medicine (MD)',
            institution: 'Johns Hopkins School of Medicine',
            graduationYear: 2018
          }
        ],
        certifications: [
          {
            name: 'Board Certified in Pediatrics',
            issuingOrganization: 'American Board of Pediatrics',
            issueDate: new Date('2020-09-10')
          }
        ],
        bio: 'Pediatrician dedicated to providing comprehensive care for children from infancy through adolescence.',
        languages: ['English', 'Spanish', 'Portuguese'],
        consultationFee: 3,
        timeZone: 'America/Chicago',
        verificationStatus: DoctorVerificationStatus.APPROVED,
        rating: 4.7,
        totalRatings: 89,
        totalConsultations: 234,
        isOnline: true,
        availability: [
          { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isAvailable: true },
          { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', isAvailable: true },
          { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', isAvailable: true },
          { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', isAvailable: true },
          { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', isAvailable: true }
        ]
      }
    ];

    const createdDoctors = await Doctor.insertMany(demoDoctors);
    console.log(`Created ${createdDoctors.length} demo doctors`);

    // Create demo patient
    const demoPatients = [
      {
        userId: createdUsers[3]._id,
        clerkId: 'demo_patient_1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male',
        phone: '+1-555-0123',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA'
        },
        creditBalance: 5,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        totalAppointments: 3,
        totalSpent: 12
      }
    ];

    const createdPatients = await Patient.insertMany(demoPatients);
    console.log(`Created ${createdPatients.length} demo patients`);

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      data: {
        users: createdUsers.length,
        doctors: createdDoctors.length,
        patients: createdPatients.length
      }
    });

  } catch (error) {
    console.error('Error seeding demo data:', error);
    return NextResponse.json({
      error: 'Failed to seed demo data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
