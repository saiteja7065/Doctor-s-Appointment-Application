// Client-side user types and enums
// This file contains types that can be safely imported on the client side

export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

// Medical specialties enum (matching the backend)
export enum MedicalSpecialty {
  GENERAL_PRACTICE = 'GENERAL_PRACTICE',
  CARDIOLOGY = 'CARDIOLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  ENDOCRINOLOGY = 'ENDOCRINOLOGY',
  GASTROENTEROLOGY = 'GASTROENTEROLOGY',
  NEUROLOGY = 'NEUROLOGY',
  ONCOLOGY = 'ONCOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  PEDIATRICS = 'PEDIATRICS',
  PSYCHIATRY = 'PSYCHIATRY',
  RADIOLOGY = 'RADIOLOGY',
  SURGERY = 'SURGERY',
  UROLOGY = 'UROLOGY',
  GYNECOLOGY = 'GYNECOLOGY',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  ENT = 'ENT',
  ANESTHESIOLOGY = 'ANESTHESIOLOGY',
  PATHOLOGY = 'PATHOLOGY',
  EMERGENCY_MEDICINE = 'EMERGENCY_MEDICINE',
  FAMILY_MEDICINE = 'FAMILY_MEDICINE',
}

// Doctor verification status
export enum DoctorVerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// Client-safe interfaces
export interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorApplication {
  specialty: MedicalSpecialty;
  licenseNumber: string;
  credentialUrl: string;
  yearsOfExperience: number;
  education: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  certifications: {
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expiryDate?: string;
  }[];
  bio: string;
  languages: string[];
  timeZone: string;
  consultationFee: number;
}

export interface DoctorProfile extends DoctorApplication {
  id: string;
  userId: string;
  clerkId: string;
  verificationStatus: DoctorVerificationStatus;
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  totalEarnings: number;
  totalConsultations: number;
  averageRating: number;
  totalRatings: number;
  isOnline: boolean;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}
