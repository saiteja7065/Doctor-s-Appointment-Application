import mongoose, { Schema, Document } from 'mongoose';

// System settings interface
export interface ISystemSettings extends Document {
  appointmentSettings: {
    defaultDuration: number;
    minBookingNotice: number;
    maxAdvanceBooking: number;
    cancellationPolicy: {
      allowedUntil: number;
      refundPercentage: number;
    };
  };
  paymentSettings: {
    platformFeePercentage: number;
    minimumWithdrawalAmount: number;
    withdrawalProcessingDays: number;
    defaultCredits: number;
    creditPricing: {
      standard: number;
      bulk: number;
    };
  };
  notificationSettings: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    reminderTimes: number[];
  };
  maintenanceMode: {
    enabled: boolean;
    message: string;
    plannedEndTime: Date | null;
  };
  featureFlags: {
    videoConsultation: boolean;
    instantConsultation: boolean;
    subscriptionPlans: boolean;
    doctorReviews: boolean;
    patientMedicalHistory: boolean;
    emergencyConsultation: boolean;
  };
  updatedAt: Date;
  createdAt: Date;
}

// System settings schema
const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    appointmentSettings: {
      defaultDuration: {
        type: Number,
        default: 30,
        min: 5,
        max: 120
      },
      minBookingNotice: {
        type: Number,
        default: 60,
        min: 0
      },
      maxAdvanceBooking: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
      },
      cancellationPolicy: {
        allowedUntil: {
          type: Number,
          default: 24,
          min: 0
        },
        refundPercentage: {
          type: Number,
          default: 80,
          min: 0,
          max: 100
        }
      }
    },
    paymentSettings: {
      platformFeePercentage: {
        type: Number,
        default: 15,
        min: 0,
        max: 100
      },
      minimumWithdrawalAmount: {
        type: Number,
        default: 50,
        min: 0
      },
      withdrawalProcessingDays: {
        type: Number,
        default: 3,
        min: 1
      },
      defaultCredits: {
        type: Number,
        default: 2,
        min: 0
      },
      creditPricing: {
        standard: {
          type: Number,
          default: 10,
          min: 0
        },
        bulk: {
          type: Number,
          default: 8,
          min: 0
        }
      }
    },
    notificationSettings: {
      emailEnabled: {
        type: Boolean,
        default: true
      },
      smsEnabled: {
        type: Boolean,
        default: true
      },
      pushEnabled: {
        type: Boolean,
        default: true
      },
      reminderTimes: {
        type: [Number],
        default: [24, 2]
      }
    },
    maintenanceMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      message: {
        type: String,
        default: "System is undergoing scheduled maintenance. Please check back later."
      },
      plannedEndTime: {
        type: Date,
        default: null
      }
    },
    featureFlags: {
      videoConsultation: {
        type: Boolean,
        default: true
      },
      instantConsultation: {
        type: Boolean,
        default: false
      },
      subscriptionPlans: {
        type: Boolean,
        default: true
      },
      doctorReviews: {
        type: Boolean,
        default: true
      },
      patientMedicalHistory: {
        type: Boolean,
        default: true
      },
      emergencyConsultation: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true,
    collection: 'systemSettings'
  }
);

// Ensure there's only one settings document
SystemSettingsSchema.pre('save', async function(next) {
  const count = await mongoose.models.SystemSettings?.countDocuments() || 0;
  
  // If this is a new document and there's already one in the collection
  if (this.isNew && count > 0) {
    const error = new Error('Only one system settings document can exist');
    return next(error);
  }
  
  next();
});

// Prevent model re-compilation during development
export const SystemSettings = (mongoose.models?.SystemSettings as mongoose.Model<ISystemSettings>) || 
  mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
