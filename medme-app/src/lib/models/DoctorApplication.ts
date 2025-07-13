import mongoose, { Schema, Document } from 'mongoose';
import { MedicalSpecialty } from './Doctor';

// Application status enum
export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_ADDITIONAL_INFO = 'requires_additional_info',
}

// Document type enum
export enum DocumentType {
  MEDICAL_LICENSE = 'medical_license',
  DEGREE_CERTIFICATE = 'degree_certificate',
  CERTIFICATION = 'certification',
  ADDITIONAL_DOCUMENT = 'additional_document',
}

// Uploaded document interface
export interface IUploadedDocument {
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
}

// Admin review interface
export interface IAdminReview {
  reviewedBy: string; // Admin clerk ID
  reviewedAt: Date;
  status: ApplicationStatus;
  comments?: string;
  requestedChanges?: string[];
}

// Doctor application interface
export interface IDoctorApplication extends Document {
  clerkId: string; // Applicant's Clerk ID
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  
  // Professional Information
  specialty: MedicalSpecialty;
  licenseNumber: string;
  credentialUrl: string; // URL to verify credentials online
  yearsOfExperience: number;
  
  // Education
  education: {
    degree: string;
    institution: string;
    graduationYear: number;
  }[];
  
  // Certifications
  certifications: {
    name: string;
    issuingOrganization: string;
    issueDate: Date;
    expiryDate?: Date;
  }[];
  
  // Documents
  uploadedDocuments: IUploadedDocument[];
  
  // Professional Details
  bio?: string;
  languages: string[];
  consultationFee: number; // Proposed fee in credits
  
  // Application Status
  status: ApplicationStatus;
  submittedAt: Date;
  
  // Admin Review
  adminReviews: IAdminReview[];
  
  // Additional Information
  additionalNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Doctor application schema
const DoctorApplicationSchema = new Schema<IDoctorApplication>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
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
    uploadedDocuments: [{
      type: {
        type: String,
        enum: Object.values(DocumentType),
        required: true,
      },
      fileName: {
        type: String,
        required: true,
        trim: true,
      },
      fileUrl: {
        type: String,
        required: true,
        trim: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      fileSize: {
        type: Number,
        required: true,
      },
      mimeType: {
        type: String,
        required: true,
        trim: true,
      },
    }],
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    languages: [{
      type: String,
      trim: true,
    }],
    consultationFee: {
      type: Number,
      default: 2,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PENDING,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    adminReviews: [{
      reviewedBy: {
        type: String,
        required: true,
      },
      reviewedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: Object.values(ApplicationStatus),
        required: true,
      },
      comments: {
        type: String,
        trim: true,
      },
      requestedChanges: [{
        type: String,
        trim: true,
      }],
    }],
    additionalNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
DoctorApplicationSchema.index({ clerkId: 1 });
DoctorApplicationSchema.index({ status: 1 });
DoctorApplicationSchema.index({ submittedAt: -1 });
DoctorApplicationSchema.index({ specialty: 1 });
DoctorApplicationSchema.index({ email: 1 });

// Virtual for full name
DoctorApplicationSchema.virtual('fullName').get(function (this: IDoctorApplication) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for latest admin review
DoctorApplicationSchema.virtual('latestReview').get(function (this: IDoctorApplication) {
  return this.adminReviews.length > 0 
    ? this.adminReviews[this.adminReviews.length - 1] 
    : null;
});

// Method to add admin review
DoctorApplicationSchema.methods.addAdminReview = function(
  reviewedBy: string, 
  status: ApplicationStatus, 
  comments?: string, 
  requestedChanges?: string[]
) {
  this.adminReviews.push({
    reviewedBy,
    reviewedAt: new Date(),
    status,
    comments,
    requestedChanges: requestedChanges || [],
  });
  this.status = status;
};

// Method to add uploaded document
DoctorApplicationSchema.methods.addDocument = function(
  type: DocumentType,
  fileName: string,
  fileUrl: string,
  fileSize: number,
  mimeType: string
) {
  this.uploadedDocuments.push({
    type,
    fileName,
    fileUrl,
    uploadedAt: new Date(),
    fileSize,
    mimeType,
  });
};

// Prevent model re-compilation during development
export const DoctorApplication = mongoose.models.DoctorApplication || 
  mongoose.model<IDoctorApplication>('DoctorApplication', DoctorApplicationSchema);

export default DoctorApplication;
