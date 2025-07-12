// Notification types for client-side use
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

// Client-side notification interface
export interface INotification {
  _id: string;
  userId: string;
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
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
