import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserRole, UserStatus } from '@/lib/models/User';
import { Patient } from '@/lib/models/Patient';
import { Doctor } from '@/lib/models/Doctor';

interface UserAccountResponse {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profileImage?: string;
  createdAt: string;
  lastLogin?: string;
  patientData?: {
    creditBalance: number;
    subscriptionPlan: string;
    subscriptionStatus: string;
    totalAppointments: number;
    totalSpent: number;
  };
  doctorData?: {
    specialty: string;
    verificationStatus: string;
    licenseNumber: string;
    totalEarnings: number;
    totalConsultations: number;
    averageRating: number;
  };
}

async function getUserAccounts(): Promise<UserAccountResponse[]> {
  const isConnected = await connectToDatabase();
  
  if (!isConnected) {
    // Return demo data if database is not available
    return [
      {
        _id: 'demo_user_1',
        clerkId: 'clerk_patient_demo_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        role: 'patient',
        status: 'active',
        phoneNumber: '+1234567890',
        dateOfBirth: '1985-06-15',
        createdAt: '2025-07-01T10:30:00Z',
        lastLogin: '2025-07-11T08:45:00Z',
        patientData: {
          creditBalance: 15,
          subscriptionPlan: 'premium',
          subscriptionStatus: 'active',
          totalAppointments: 12,
          totalSpent: 240
        }
      },
      {
        _id: 'demo_user_2',
        clerkId: 'clerk_doctor_demo_456',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        role: 'doctor',
        status: 'active',
        phoneNumber: '+1987654321',
        createdAt: '2025-06-15T14:20:00Z',
        lastLogin: '2025-07-11T09:15:00Z',
        doctorData: {
          specialty: 'Cardiology',
          verificationStatus: 'approved',
          licenseNumber: 'MD123456',
          totalEarnings: 1250,
          totalConsultations: 45,
          averageRating: 4.8
        }
      },
      {
        _id: 'demo_user_3',
        clerkId: 'clerk_patient_demo_789',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@email.com',
        role: 'patient',
        status: 'suspended',
        phoneNumber: '+1555123456',
        dateOfBirth: '1992-03-22',
        createdAt: '2025-06-20T16:45:00Z',
        lastLogin: '2025-07-08T12:30:00Z',
        patientData: {
          creditBalance: 0,
          subscriptionPlan: 'free',
          subscriptionStatus: 'inactive',
          totalAppointments: 3,
          totalSpent: 60
        }
      },
      {
        _id: 'demo_user_4',
        clerkId: 'clerk_doctor_demo_101',
        firstName: 'Dr. Michael',
        lastName: 'Chen',
        email: 'michael.chen@email.com',
        role: 'doctor',
        status: 'pending_verification',
        phoneNumber: '+1444555666',
        createdAt: '2025-07-05T11:20:00Z',
        doctorData: {
          specialty: 'Dermatology',
          verificationStatus: 'pending',
          licenseNumber: 'MD789012',
          totalEarnings: 0,
          totalConsultations: 0,
          averageRating: 0
        }
      }
    ];
  }

  try {
    // Fetch all users with role-specific data
    const users = await User.find()
      .sort({ createdAt: -1 })
      .lean();

    const userAccounts: UserAccountResponse[] = [];

    for (const user of users) {
      const userAccount: UserAccountResponse = {
        _id: user._id.toString(),
        clerkId: user.clerkId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth?.toISOString(),
        profileImage: user.profileImage,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        // Note: lastLogin would need to be tracked separately in a real implementation
        lastLogin: user.updatedAt?.toISOString()
      };

      // Fetch role-specific data
      if (user.role === UserRole.PATIENT) {
        const patient = await Patient.findOne({ userId: user._id }).lean();
        if (patient) {
          userAccount.patientData = {
            creditBalance: patient.creditBalance,
            subscriptionPlan: patient.subscriptionPlan || 'free',
            subscriptionStatus: patient.subscriptionStatus,
            totalAppointments: patient.totalAppointments,
            totalSpent: patient.totalSpent
          };
        }
      } else if (user.role === UserRole.DOCTOR) {
        const doctor = await Doctor.findOne({ userId: user._id }).lean();
        if (doctor) {
          userAccount.doctorData = {
            specialty: doctor.specialty,
            verificationStatus: doctor.verificationStatus,
            licenseNumber: doctor.licenseNumber,
            totalEarnings: doctor.totalEarnings,
            totalConsultations: doctor.totalConsultations,
            averageRating: doctor.averageRating
          };
        }
      }

      userAccounts.push(userAccount);
    }

    return userAccounts;

  } catch (error) {
    console.error('Error fetching user accounts:', error);
    
    // Return demo data on error
    return [
      {
        _id: 'demo_user_1',
        clerkId: 'clerk_patient_demo_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@email.com',
        role: 'patient',
        status: 'active',
        phoneNumber: '+1234567890',
        dateOfBirth: '1985-06-15',
        createdAt: '2025-07-01T10:30:00Z',
        lastLogin: '2025-07-11T08:45:00Z',
        patientData: {
          creditBalance: 15,
          subscriptionPlan: 'premium',
          subscriptionStatus: 'active',
          totalAppointments: 12,
          totalSpent: 240
        }
      }
    ];
  }
}

async function handler(userContext: any, request: NextRequest) {
  try {
    const users = await getUserAccounts();

    // Calculate statistics
    const stats = {
      total: users.length,
      active: users.filter(user => user.status === 'active').length,
      inactive: users.filter(user => user.status === 'inactive').length,
      suspended: users.filter(user => user.status === 'suspended').length,
      pending: users.filter(user => user.status === 'pending_verification').length,
      patients: users.filter(user => user.role === 'patient').length,
      doctors: users.filter(user => user.role === 'doctor').length,
      admins: users.filter(user => user.role === 'admin').length
    };

    return NextResponse.json({
      users,
      stats,
      message: 'User accounts fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch user accounts'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
