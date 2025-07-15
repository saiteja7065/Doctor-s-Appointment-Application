import mongoose, { Schema, Document } from 'mongoose';

// Notification types
export enum NotificationType {
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  CONSULTATION_STARTED = 'consultation_started',
  CONSULTATION_ENDED = 'consultation_ended',
  CREDIT_DEDUCTED = 'credit_deducted',
  CREDIT_REFUNDED = 'credit_refunded',
  LOW_CREDIT_WARNING = 'low_credit_warning',
  PAYMENT_SUCCESSFUL = 'payment_successful',
  PAYMENT_FAILED = 'payment_failed',
  DOCTOR_EARNINGS = 'doctor_earnings',
  WITHDRAWAL_REQUEST = 'withdrawal_request',
  VERIFICATION_STATUS = 'verification_status',
  DOCTOR_APPLICATION_SUBMITTED = 'doctor_application_submitted',
  ACCOUNT_STATUS_CHANGED = 'account_status_changed',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  GENERAL = 'general',
}

// Notification priority levels
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Notification interface
export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clerkId: string;
  userRole: 'patient' | 'doctor' | 'admin';
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  metadata?: {
    appointmentId?: string;
    paymentId?: string;
    amount?: number;
    sessionId?: string;
    doctorName?: string;
    patientName?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    actionUrl?: string;
    additionalData?: Record<string, any>;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification schema
const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      appointmentId: {
        type: String,
        trim: true,
      },
      paymentId: {
        type: String,
        trim: true,
      },
      amount: {
        type: Number,
      },
      sessionId: {
        type: String,
        trim: true,
      },
      doctorName: {
        type: String,
        trim: true,
      },
      patientName: {
        type: String,
        trim: true,
      },
      appointmentDate: {
        type: String,
        trim: true,
      },
      appointmentTime: {
        type: String,
        trim: true,
      },
      actionUrl: {
        type: String,
        trim: true,
      },
      additionalData: {
        type: Schema.Types.Mixed,
      },
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient querying
NotificationSchema.index({ clerkId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userRole: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 }); // For general time-based queries

// Virtual for formatted timestamp
NotificationSchema.virtual('formattedTimestamp').get(function (this: INotification) {
  return this.createdAt.toISOString();
});

// Static method to create notification
NotificationSchema.statics.createNotification = async function(notificationData: Partial<INotification>) {
  try {
    const notification = new this(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

// Static method to mark as read
NotificationSchema.statics.markAsRead = async function(notificationId: string, clerkId: string) {
  try {
    const result = await this.updateOne(
      { _id: notificationId, clerkId },
      { isRead: true }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
};

// Static method to mark all as read for a user
NotificationSchema.statics.markAllAsRead = async function(clerkId: string) {
  try {
    const result = await this.updateMany(
      { clerkId, isRead: false },
      { isRead: true }
    );
    return result.modifiedCount;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return 0;
  }
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(clerkId: string) {
  try {
    return await this.countDocuments({ clerkId, isRead: false, isArchived: false });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
};

// Prevent model re-compilation during development
export const Notification = (mongoose.models?.Notification as mongoose.Model<INotification>) || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
