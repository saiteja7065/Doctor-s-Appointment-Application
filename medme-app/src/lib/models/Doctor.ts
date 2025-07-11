import mongoose, { Schema, Document } from 'mongoose';

// Doctor verification status
export enum DoctorVerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// Medical specialties
export enum MedicalSpecialty {
  GENERAL_PRACTICE = 'general_practice',
  CARDIOLOGY = 'cardiology',
  DERMATOLOGY = 'dermatology',
  PEDIATRICS = 'pediatrics',
  NEUROLOGY = 'neurology',
  ONCOLOGY = 'oncology',
  PSYCHIATRY = 'psychiatry',
  ORTHOPEDICS = 'orthopedics',
  GYNECOLOGY = 'gynecology',
  ENDOCRINOLOGY = 'endocrinology',
  GASTROENTEROLOGY = 'gastroenterology',
  PULMONOLOGY = 'pulmonology',
  RHEUMATOLOGY = 'rheumatology',
  UROLOGY = 'urology',
  OPHTHALMOLOGY = 'ophthalmology',
  ENT = 'ent',
  RADIOLOGY = 'radiology',
  ANESTHESIOLOGY = 'anesthesiology',
  EMERGENCY_MEDICINE = 'emergency_medicine',
  FAMILY_MEDICINE = 'family_medicine',
}

// Doctor availability time slot (stored in UTC)
export interface ITimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday) in UTC
  startTime: string; // HH:MM format in UTC
  endTime: string; // HH:MM format in UTC
  isAvailable: boolean;
  originalTimezone?: string; // Doctor's timezone when setting availability
}

// Doctor interface
export interface IDoctor extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User document
  clerkId: string; // For quick lookups
  verificationStatus: DoctorVerificationStatus;
  specialty: MedicalSpecialty;
  licenseNumber: string;
  credentialUrl: string; // URL to verify credentials
  yearsOfExperience: number;
  education: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  certifications: {
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    expiryDate?: Date;
  }[];
  availability: ITimeSlot[];
  consultationFee: number; // In credits
  totalEarnings: number;
  totalConsultations: number;
  averageRating: number;
  totalRatings: number;
  bio?: string;
  languages: string[];
  timeZone: string;
  isOnline: boolean;
  lastActiveAt: Date;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
  paypalEmail?: string;
  upiId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Doctor schema
const DoctorSchema = new Schema<IDoctor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(DoctorVerificationStatus),
      default: DoctorVerificationStatus.PENDING,
    },
    specialty: {
      type: String,
      enum: Object.values(MedicalSpecialty),
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    credentialUrl: {
      type: String,
      required: true,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      required: true,
      min: 0,
    },
    education: [{
      degree: {
        type: String,
        required: true,
        trim: true,
      },
      institution: {
        type: String,
        required: true,
        trim: true,
      },
      graduationYear: {
        type: Number,
        required: true,
      },
    }],
    certifications: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      issuingOrganization: {
        type: String,
        required: true,
        trim: true,
      },
      issueDate: {
        type: Date,
        required: true,
      },
      expiryDate: {
        type: Date,
      },
    }],
    availability: [{
      dayOfWeek: {
        type: Number,
        required: true,
        min: 0,
        max: 6,
      },
      startTime: {
        type: String,
        required: true,
        // Stored in UTC HH:MM format
      },
      endTime: {
        type: String,
        required: true,
        // Stored in UTC HH:MM format
      },
      isAvailable: {
        type: Boolean,
        default: true,
      },
      originalTimezone: {
        type: String,
        // Doctor's timezone when setting availability
      },
    }],
    consultationFee: {
      type: Number,
      default: 2, // Standard fee in credits
      min: 1,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalConsultations: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    languages: [{
      type: String,
      trim: true,
    }],
    timeZone: {
      type: String,
      default: 'UTC',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    bankDetails: {
      accountHolderName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      routingNumber: {
        type: String,
        trim: true,
      },
      bankName: {
        type: String,
        trim: true,
      },
    },
    paypalEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    upiId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance (clerkId and userId already have unique indexes)
DoctorSchema.index({ verificationStatus: 1 });
DoctorSchema.index({ specialty: 1 });
DoctorSchema.index({ isOnline: 1 });
DoctorSchema.index({ averageRating: -1 });
DoctorSchema.index({ totalConsultations: -1 });
DoctorSchema.index({ createdAt: -1 });

// Virtual for formatted specialty
DoctorSchema.virtual('formattedSpecialty').get(function (this: IDoctor) {
  return this.specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// Method to add earnings
DoctorSchema.methods.addEarnings = function(amount: number) {
  this.totalEarnings += amount;
  this.totalConsultations += 1;
};

// Method to update rating
DoctorSchema.methods.updateRating = function(newRating: number) {
  const totalScore = this.averageRating * this.totalRatings + newRating;
  this.totalRatings += 1;
  this.averageRating = totalScore / this.totalRatings;
};

// Prevent model re-compilation during development
export const Doctor = mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', DoctorSchema);

export default Doctor;
