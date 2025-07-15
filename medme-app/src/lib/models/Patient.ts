import mongoose, { Schema, Document } from 'mongoose';

// Patient-specific interface extending base user data
export interface IPatient extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User document
  clerkId: string; // For quick lookups
  creditBalance: number;
  subscriptionPlan?: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'expired';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
  totalAppointments: number;
  totalSpent: number;
  emergencyContact?: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  medicalHistory?: {
    allergies?: string[];
    medications?: string[];
    conditions?: string[];
    notes?: string;
  };
  preferences?: {
    preferredLanguage?: string;
    timeZone?: string;
    notificationSettings?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  paymentSettings?: {
    autoRecharge?: boolean;
    autoRechargeThreshold?: number;
    autoRechargeAmount?: number;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    receiptEmails?: boolean;
    lowBalanceAlerts?: boolean;
    subscriptionReminders?: boolean;
  };
  subscriptionSettings?: {
    autoRenew?: boolean;
    billingCycle?: 'monthly' | 'yearly';
    pauseOnLowUsage?: boolean;
    upgradeNotifications?: boolean;
    usageAlerts?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Patient schema
const PatientSchema = new Schema<IPatient>(
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
    creditBalance: {
      type: Number,
      default: 2, // Free credits for new patients
      min: 0,
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'standard', 'premium'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'inactive',
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    stripeCustomerId: {
      type: String,
      sparse: true, // Allow multiple null values but unique non-null values
    },
    totalAppointments: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      relationship: {
        type: String,
        trim: true,
      },
      phoneNumber: {
        type: String,
        trim: true,
      },
    },
    medicalHistory: {
      allergies: [{
        type: String,
        trim: true,
      }],
      medications: [{
        type: String,
        trim: true,
      }],
      conditions: [{
        type: String,
        trim: true,
      }],
      notes: {
        type: String,
        trim: true,
      },
    },
    preferences: {
      preferredLanguage: {
        type: String,
        default: 'en',
      },
      timeZone: {
        type: String,
        default: 'UTC',
      },
      notificationSettings: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    paymentSettings: {
      autoRecharge: {
        type: Boolean,
        default: false,
      },
      autoRechargeThreshold: {
        type: Number,
        default: 2,
        min: 1,
        max: 10,
      },
      autoRechargeAmount: {
        type: Number,
        default: 10,
        min: 5,
        max: 100,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      receiptEmails: {
        type: Boolean,
        default: true,
      },
      lowBalanceAlerts: {
        type: Boolean,
        default: true,
      },
      subscriptionReminders: {
        type: Boolean,
        default: true,
      },
    },
    subscriptionSettings: {
      autoRenew: {
        type: Boolean,
        default: true,
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly',
      },
      pauseOnLowUsage: {
        type: Boolean,
        default: false,
      },
      upgradeNotifications: {
        type: Boolean,
        default: true,
      },
      usageAlerts: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance (clerkId and userId already have unique indexes)
PatientSchema.index({ subscriptionStatus: 1 });
PatientSchema.index({ subscriptionPlan: 1 });
PatientSchema.index({ creditBalance: 1 });
PatientSchema.index({ createdAt: -1 });

// Virtual to check if patient has sufficient credits
PatientSchema.virtual('hasSufficientCredits').get(function (this: IPatient) {
  return this.creditBalance >= 2; // Standard appointment cost
});

// Method to deduct credits
PatientSchema.methods.deductCredits = function(amount: number) {
  if (this.creditBalance >= amount) {
    this.creditBalance -= amount;
    return true;
  }
  return false;
};

// Method to add credits
PatientSchema.methods.addCredits = function(amount: number) {
  this.creditBalance += amount;
};

// Prevent model re-compilation during development
export const Patient = (mongoose.models?.Patient as mongoose.Model<IPatient>) || mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
