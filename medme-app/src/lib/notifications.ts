import { connectToDatabase } from './mongodb';
import { Patient } from './models/Patient';
import { Doctor } from './models/Doctor';
import { User } from './models/User';
import Notification, { INotification } from './models/Notification';
import { NotificationType, NotificationPriority } from './types/notifications';

// Re-export notification types for server-side use
export { NotificationType, NotificationPriority } from './types/notifications';

// Notification interface
export interface INotification {
  id: string;
  userId: string;
  userType: 'patient' | 'doctor' | 'admin';
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

// In-memory notification store (in production, use Redis or database)
const notificationStore = new Map<string, INotification[]>();

/**
 * Create a new notification
 */
export async function createNotification(
  clerkId: string,
  userRole: 'patient' | 'doctor' | 'admin',
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    priority?: NotificationPriority;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    expiresAt?: Date;
  }
): Promise<INotification | null> {
  try {
    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      console.warn('Database not available, skipping notification creation');
      return null;
    }

    // Find user by clerkId to get the userId
    const user = await User.findOne({ clerkId });
    if (!user) {
      console.warn(`User not found for clerkId: ${clerkId}`);
      return null;
    }

    // Create notification
    const notification = new Notification({
      userId: user._id,
      clerkId,
      userRole,
      type,
      title,
      message,
      priority: options?.priority || NotificationPriority.MEDIUM,
      metadata: {
        actionUrl: options?.actionUrl,
        ...options?.metadata,
      },
      expiresAt: options?.expiresAt,
    });

    const savedNotification = await notification.save();
    return savedNotification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Get notifications for a user
 */
export function getUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    type?: NotificationType;
  }
): INotification[] {
  const userNotifications = notificationStore.get(userId) || [];
  
  let filtered = userNotifications.filter(notif => {
    // Filter expired notifications
    if (notif.expiresAt && notif.expiresAt < new Date()) {
      return false;
    }
    
    // Filter by read status
    if (options?.unreadOnly && notif.read) {
      return false;
    }
    
    // Filter by type
    if (options?.type && notif.type !== options.type) {
      return false;
    }
    
    return true;
  });
  
  // Apply limit
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Mark notification as read
 */
export function markNotificationAsRead(userId: string, notificationId: string): boolean {
  const userNotifications = notificationStore.get(userId) || [];
  const notification = userNotifications.find(n => n.id === notificationId);
  
  if (notification) {
    notification.read = true;
    return true;
  }
  
  return false;
}

/**
 * Mark all notifications as read for a user
 */
export function markAllNotificationsAsRead(userId: string): number {
  const userNotifications = notificationStore.get(userId) || [];
  let count = 0;
  
  userNotifications.forEach(notification => {
    if (!notification.read) {
      notification.read = true;
      count++;
    }
  });
  
  return count;
}

/**
 * Delete a notification
 */
export function deleteNotification(userId: string, notificationId: string): boolean {
  const userNotifications = notificationStore.get(userId) || [];
  const index = userNotifications.findIndex(n => n.id === notificationId);
  
  if (index !== -1) {
    userNotifications.splice(index, 1);
    notificationStore.set(userId, userNotifications);
    return true;
  }
  
  return false;
}

/**
 * Get unread notification count
 */
export function getUnreadNotificationCount(userId: string): number {
  const userNotifications = notificationStore.get(userId) || [];
  return userNotifications.filter(n => !n.read && (!n.expiresAt || n.expiresAt > new Date())).length;
}

// Predefined notification templates
export const notificationTemplates = {
  appointmentConfirmed: (doctorName: string, appointmentDate: string, appointmentId: string) => ({
    type: NotificationType.APPOINTMENT_CONFIRMED,
    title: 'Appointment Confirmed',
    message: `Your appointment with Dr. ${doctorName} on ${appointmentDate} has been confirmed.`,
    priority: NotificationPriority.HIGH,
    actionUrl: `/dashboard/patient/appointments`,
    actionLabel: 'View Appointment',
    metadata: { appointmentId }
  }),

  appointmentReminder: (doctorName: string, appointmentTime: string, appointmentId: string) => ({
    type: NotificationType.APPOINTMENT_REMINDER,
    title: 'Appointment Reminder',
    message: `Don't forget your appointment with Dr. ${doctorName} tomorrow at ${appointmentTime}.`,
    priority: NotificationPriority.HIGH,
    actionUrl: `/dashboard/patient/appointments`,
    actionLabel: 'View Appointment',
    metadata: { appointmentId }
  }),

  paymentSuccessful: (amount: string, credits?: number) => ({
    type: NotificationType.PAYMENT_SUCCESSFUL,
    title: 'Payment Successful',
    message: credits 
      ? `Payment of ${amount} successful. ${credits} credits added to your account.`
      : `Payment of ${amount} processed successfully.`,
    priority: NotificationPriority.MEDIUM,
    actionUrl: `/dashboard/patient/subscription`,
    actionLabel: 'View Account',
    metadata: { amount, credits }
  }),

  subscriptionActivated: (planName: string, credits: number) => ({
    type: NotificationType.SUBSCRIPTION_ACTIVATED,
    title: 'Subscription Activated',
    message: `Welcome to ${planName}! ${credits} credits have been added to your account.`,
    priority: NotificationPriority.HIGH,
    actionUrl: `/dashboard/patient/subscription`,
    actionLabel: 'View Plan',
    metadata: { planName, credits }
  }),

  creditsLow: (currentCredits: number) => ({
    type: NotificationType.CREDITS_LOW,
    title: 'Credits Running Low',
    message: `You have ${currentCredits} credits remaining. Consider purchasing more to continue consultations.`,
    priority: NotificationPriority.MEDIUM,
    actionUrl: `/dashboard/patient/subscription`,
    actionLabel: 'Buy Credits',
    metadata: { currentCredits }
  }),

  doctorApplicationApproved: () => ({
    type: NotificationType.DOCTOR_APPLICATION_APPROVED,
    title: 'Application Approved',
    message: 'Congratulations! Your doctor application has been approved. You can now start accepting patients.',
    priority: NotificationPriority.HIGH,
    actionUrl: `/dashboard/doctor`,
    actionLabel: 'Go to Dashboard',
  }),

  consultationStarted: (patientName: string, appointmentId: string) => ({
    type: NotificationType.CONSULTATION_STARTED,
    title: 'Consultation Started',
    message: `Your consultation with ${patientName} has started.`,
    priority: NotificationPriority.URGENT,
    actionUrl: `/consultation/${appointmentId}`,
    actionLabel: 'Join Consultation',
    metadata: { appointmentId, patientName }
  }),
};

/**
 * Send notification using template
 */
export function sendNotification(
  userId: string,
  userType: 'patient' | 'doctor' | 'admin',
  template: keyof typeof notificationTemplates,
  ...args: any[]
): INotification {
  const templateFn = notificationTemplates[template] as (...args: any[]) => any;
  const notificationData = templateFn(...args);
  
  return createNotification(
    userId,
    userType,
    notificationData.type,
    notificationData.title,
    notificationData.message,
    {
      priority: notificationData.priority,
      actionUrl: notificationData.actionUrl,
      actionLabel: notificationData.actionLabel,
      metadata: notificationData.metadata,
    }
  );
}

/**
 * Update credit balance and send low credit notification if needed
 */
export async function updateCreditsAndNotify(userId: string, newBalance: number): Promise<void> {
  // Send low credit warning if balance is low
  if (newBalance <= 2 && newBalance > 0) {
    sendNotification(userId, 'patient', 'creditsLow', newBalance);
  }
}

/**
 * Clean up expired notifications (should be called periodically)
 */
export function cleanupExpiredNotifications(): number {
  let cleanedCount = 0;
  
  for (const [userId, notifications] of notificationStore.entries()) {
    const validNotifications = notifications.filter(notif => {
      if (notif.expiresAt && notif.expiresAt < new Date()) {
        cleanedCount++;
        return false;
      }
      return true;
    });
    
    if (validNotifications.length !== notifications.length) {
      notificationStore.set(userId, validNotifications);
    }
  }
  
  return cleanedCount;
}
