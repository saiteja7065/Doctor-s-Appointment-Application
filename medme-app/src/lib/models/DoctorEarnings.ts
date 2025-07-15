import mongoose, { Schema, Document, Types } from 'mongoose';

// Enums for earnings tracking
export enum EarningType {
  CONSULTATION = 'consultation',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  ADJUSTMENT = 'adjustment'
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum WithdrawalMethod {
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  UPI = 'upi',
  CHECK = 'check'
}

// Earning transaction interface
export interface IEarningTransaction extends Document {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  clerkId: string;
  type: EarningType;
  amount: number; // in credits
  description: string;
  appointmentId?: Types.ObjectId;
  patientId?: Types.ObjectId;
  patientName?: string;
  consultationDate?: Date;
  status: 'pending' | 'completed' | 'failed';
  metadata?: {
    consultationType?: string;
    originalAmount?: number;
    bonusReason?: string;
    referralCode?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Withdrawal request interface
export interface IWithdrawalRequest extends Document {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  clerkId: string;
  requestId: string;
  amount: number; // in credits
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  requestDate: Date;
  processedDate?: Date;
  completedDate?: Date;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
  paypalEmail?: string;
  upiId?: string;
  notes?: string;
  adminNotes?: string;
  transactionId?: string; // External transaction ID
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Doctor earnings summary interface
export interface IDoctorEarnings extends Document {
  _id: Types.ObjectId;
  doctorId: Types.ObjectId;
  clerkId: string;
  totalEarnings: number; // Total credits earned all time
  availableBalance: number; // Credits available for withdrawal
  pendingEarnings: number; // Credits from pending consultations
  totalWithdrawn: number; // Total credits withdrawn
  totalConsultations: number;
  averagePerConsultation: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  monthlyData: {
    month: string; // YYYY-MM format
    earnings: number;
    consultations: number;
    averageRating: number;
  }[];
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Earning Transaction Schema
const EarningTransactionSchema = new Schema<IEarningTransaction>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(EarningType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientName: {
      type: String,
      trim: true,
    },
    consultationDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    metadata: {
      consultationType: String,
      originalAmount: Number,
      bonusReason: String,
      referralCode: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Withdrawal Request Schema
const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    method: {
      type: String,
      enum: Object.values(WithdrawalMethod),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(WithdrawalStatus),
      default: WithdrawalStatus.PENDING,
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    processedDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      routingNumber: String,
      bankName: String,
    },
    paypalEmail: {
      type: String,
      trim: true,
    },
    upiId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Doctor Earnings Summary Schema
const DoctorEarningsSchema = new Schema<IDoctorEarnings>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
    },
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalConsultations: {
      type: Number,
      default: 0,
      min: 0,
    },
    averagePerConsultation: {
      type: Number,
      default: 0,
      min: 0,
    },
    thisMonthEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMonthEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyData: [{
      month: {
        type: String,
        required: true,
      },
      earnings: {
        type: Number,
        default: 0,
        min: 0,
      },
      consultations: {
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
    }],
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
EarningTransactionSchema.index({ doctorId: 1, createdAt: -1 });
EarningTransactionSchema.index({ clerkId: 1, createdAt: -1 });
EarningTransactionSchema.index({ type: 1, status: 1 });
EarningTransactionSchema.index({ appointmentId: 1 });

WithdrawalRequestSchema.index({ doctorId: 1, createdAt: -1 });
WithdrawalRequestSchema.index({ clerkId: 1, status: 1 });
WithdrawalRequestSchema.index({ status: 1, requestDate: -1 });
WithdrawalRequestSchema.index({ requestId: 1 });

DoctorEarningsSchema.index({ doctorId: 1 });
DoctorEarningsSchema.index({ clerkId: 1 });
DoctorEarningsSchema.index({ totalEarnings: -1 });
DoctorEarningsSchema.index({ lastCalculatedAt: 1 });

// Static methods for EarningTransaction
EarningTransactionSchema.statics.createConsultationEarning = function(
  doctorId: Types.ObjectId,
  clerkId: string,
  appointmentId: Types.ObjectId,
  patientId: Types.ObjectId,
  patientName: string,
  amount: number,
  consultationDate: Date,
  consultationType: string
) {
  return new this({
    doctorId,
    clerkId,
    type: EarningType.CONSULTATION,
    amount,
    description: `Consultation with ${patientName}`,
    appointmentId,
    patientId,
    patientName,
    consultationDate,
    status: 'completed',
    metadata: {
      consultationType,
      originalAmount: amount
    }
  });
};

// Virtual for formatted amount
EarningTransactionSchema.virtual('formattedAmount').get(function (this: IEarningTransaction) {
  return `${this.amount} credits`;
});

WithdrawalRequestSchema.virtual('formattedAmount').get(function (this: IWithdrawalRequest) {
  return `${this.amount} credits`;
});

// Export models
export const EarningTransaction = (mongoose.models?.EarningTransaction as mongoose.Model<IEarningTransaction>) ||
  mongoose.model<IEarningTransaction>('EarningTransaction', EarningTransactionSchema);

export const WithdrawalRequest = (mongoose.models?.WithdrawalRequest as mongoose.Model<IWithdrawalRequest>) ||
  mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);

export const DoctorEarnings = (mongoose.models?.DoctorEarnings as mongoose.Model<IDoctorEarnings>) ||
  mongoose.model<IDoctorEarnings>('DoctorEarnings', DoctorEarningsSchema);
