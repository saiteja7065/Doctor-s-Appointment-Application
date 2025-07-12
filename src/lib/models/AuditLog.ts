import mongoose, { Schema, Document } from 'mongoose';

// Audit log action types
export enum AuditAction {
  // Authentication actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  PASSWORD_RESET = 'password_reset',
  
  // User management actions
  USER_PROFILE_UPDATE = 'user_profile_update',
  USER_STATUS_CHANGE = 'user_status_change',
  USER_ROLE_CHANGE = 'user_role_change',
  
  // Doctor actions
  DOCTOR_APPLICATION_SUBMIT = 'doctor_application_submit',
  DOCTOR_VERIFICATION_UPDATE = 'doctor_verification_update',
  DOCTOR_AVAILABILITY_UPDATE = 'doctor_availability_update',
  DOCTOR_PROFILE_UPDATE = 'doctor_profile_update',
  
  // Patient actions
  PATIENT_PROFILE_UPDATE = 'patient_profile_update',
  PATIENT_SUBSCRIPTION_CHANGE = 'patient_subscription_change',
  PATIENT_CREDIT_PURCHASE = 'patient_credit_purchase',
  PATIENT_CREDIT_DEDUCTION = 'patient_credit_deduction',
  
  // Appointment actions
  APPOINTMENT_BOOK = 'appointment_book',
  APPOINTMENT_CANCEL = 'appointment_cancel',
  APPOINTMENT_RESCHEDULE = 'appointment_reschedule',
  APPOINTMENT_COMPLETE = 'appointment_complete',
  APPOINTMENT_STATUS_UPDATE = 'appointment_status_update',
  
  // Video consultation actions
  VIDEO_SESSION_START = 'video_session_start',
  VIDEO_SESSION_END = 'video_session_end',
  VIDEO_SESSION_JOIN = 'video_session_join',
  VIDEO_SESSION_LEAVE = 'video_session_leave',
  
  // Payment actions
  PAYMENT_PROCESS = 'payment_process',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILURE = 'payment_failure',
  SUBSCRIPTION_CREATE = 'subscription_create',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
  
  // Withdrawal actions
  WITHDRAWAL_REQUEST = 'withdrawal_request',
  WITHDRAWAL_APPROVE = 'withdrawal_approve',
  WITHDRAWAL_REJECT = 'withdrawal_reject',
  WITHDRAWAL_PROCESS = 'withdrawal_process',
  
  // Admin actions
  ADMIN_USER_SUSPEND = 'admin_user_suspend',
  ADMIN_USER_ACTIVATE = 'admin_user_activate',
  ADMIN_DOCTOR_APPROVE = 'admin_doctor_approve',
  ADMIN_DOCTOR_REJECT = 'admin_doctor_reject',
  ADMIN_DOCTOR_SUSPEND = 'admin_doctor_suspend',
  ADMIN_FINANCIAL_REVIEW = 'admin_financial_review',
  ADMIN_REPORT_GENERATE = 'admin_report_generate',
  
  // System actions
  SYSTEM_ERROR = 'system_error',
  SYSTEM_WARNING = 'system_warning',
  SYSTEM_INFO = 'system_info',
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  
  // Security actions
  SECURITY_LOGIN_ATTEMPT = 'security_login_attempt',
  SECURITY_FAILED_LOGIN = 'security_failed_login',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security_suspicious_activity',
  SECURITY_DATA_ACCESS = 'security_data_access',
  SECURITY_PERMISSION_DENIED = 'security_permission_denied',
}

// Audit log severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Audit log categories
export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  USER_MANAGEMENT = 'user_management',
  APPOINTMENT = 'appointment',
  PAYMENT = 'payment',
  VIDEO_CONSULTATION = 'video_consultation',
  ADMIN = 'admin',
  SECURITY = 'security',
  SYSTEM = 'system',
}

// Audit log interface
export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  userId?: mongoose.Types.ObjectId; // User who performed the action
  clerkId?: string; // Clerk ID for quick lookups
  targetUserId?: mongoose.Types.ObjectId; // User affected by the action
  targetResourceId?: string; // ID of the resource affected (appointment, payment, etc.)
  targetResourceType?: string; // Type of resource (appointment, payment, etc.)
  description: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    requestId?: string;
    sessionId?: string;
    previousValue?: any;
    newValue?: any;
    errorMessage?: string;
    stackTrace?: string;
    additionalData?: Record<string, any>;
  };
  timestamp: Date;
  createdAt: Date;
}

// Audit log schema
const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(AuditCategory),
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AuditSeverity),
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    clerkId: {
      type: String,
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetResourceId: {
      type: String,
      index: true,
    },
    targetResourceType: {
      type: String,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    metadata: {
      ipAddress: {
        type: String,
        trim: true,
      },
      userAgent: {
        type: String,
        trim: true,
      },
      endpoint: {
        type: String,
        trim: true,
      },
      method: {
        type: String,
        trim: true,
      },
      requestId: {
        type: String,
        trim: true,
      },
      sessionId: {
        type: String,
        trim: true,
      },
      previousValue: {
        type: Schema.Types.Mixed,
      },
      newValue: {
        type: Schema.Types.Mixed,
      },
      errorMessage: {
        type: String,
        trim: true,
      },
      stackTrace: {
        type: String,
        trim: true,
      },
      additionalData: {
        type: Schema.Types.Mixed,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ targetResourceType: 1, targetResourceId: 1 });

// TTL index to automatically delete old logs (optional - keep logs for 2 years)
// This also serves as the general time-based query index
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Virtual for formatted timestamp
AuditLogSchema.virtual('formattedTimestamp').get(function (this: IAuditLog) {
  return this.timestamp.toISOString();
});

// Static method to create audit log entry
AuditLogSchema.statics.createLog = async function(logData: Partial<IAuditLog>) {
  try {
    const auditLog = new this(logData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent breaking the main application flow
    return null;
  }
};

// Prevent model re-compilation during development
export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
