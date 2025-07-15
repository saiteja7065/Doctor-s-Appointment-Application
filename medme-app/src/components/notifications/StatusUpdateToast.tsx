'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  CreditCard, 
  Video,
  AlertTriangle,
  Info,
  Star,
  UserCheck
} from 'lucide-react';

export interface StatusUpdateData {
  type: 'appointment' | 'payment' | 'consultation' | 'system' | 'credit' | 'verification';
  status: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  duration?: number;
}

const getIcon = (type: StatusUpdateData['type'], status: StatusUpdateData['status']) => {
  if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'error') return <XCircle className="h-5 w-5 text-red-500" />;
  if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  
  switch (type) {
    case 'appointment':
      return <Calendar className="h-5 w-5 text-blue-500" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case 'consultation':
      return <Video className="h-5 w-5 text-purple-500" />;
    case 'credit':
      return <Star className="h-5 w-5 text-yellow-500" />;
    case 'verification':
      return <UserCheck className="h-5 w-5 text-blue-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getToastStyle = (status: StatusUpdateData['status']) => {
  const baseStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  };

  switch (status) {
    case 'success':
      return { ...baseStyle, borderLeft: '4px solid #10b981' };
    case 'error':
      return { ...baseStyle, borderLeft: '4px solid #ef4444' };
    case 'warning':
      return { ...baseStyle, borderLeft: '4px solid #f59e0b' };
    default:
      return { ...baseStyle, borderLeft: '4px solid #3b82f6' };
  }
};

export function showStatusUpdateToast(data: StatusUpdateData) {
  const icon = getIcon(data.type, data.status);
  const style = getToastStyle(data.status);

  const toastContent = (
    <div className="flex items-start gap-3 w-full">
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground mb-1">
          {data.title}
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {data.message}
        </div>
        {data.actionUrl && data.actionLabel && (
          <button
            onClick={() => window.location.href = data.actionUrl!}
            className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {data.actionLabel} →
          </button>
        )}
      </div>
    </div>
  );

  switch (data.status) {
    case 'success':
      toast.success(toastContent, {
        duration: data.duration || 5000,
        style,
      });
      break;
    case 'error':
      toast.error(toastContent, {
        duration: data.duration || 8000,
        style,
      });
      break;
    case 'warning':
      toast.warning(toastContent, {
        duration: data.duration || 6000,
        style,
      });
      break;
    default:
      toast.info(toastContent, {
        duration: data.duration || 4000,
        style,
      });
      break;
  }
}

// Predefined status update templates
export const statusUpdateTemplates = {
  appointmentBooked: (doctorName: string, appointmentDate: string) => ({
    type: 'appointment' as const,
    status: 'success' as const,
    title: 'Appointment Booked Successfully',
    message: `Your appointment with ${doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`} on ${appointmentDate} has been confirmed.`,
    actionUrl: '/dashboard/patient/appointments',
    actionLabel: 'View Appointment',
    duration: 6000,
  }),

  appointmentCancelled: (doctorName: string, refunded: boolean) => ({
    type: 'appointment' as const,
    status: 'info' as const,
    title: 'Appointment Cancelled',
    message: `Your appointment with ${doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`} has been cancelled.${refunded ? ' Credits have been refunded to your account.' : ''}`,
    actionUrl: '/dashboard/patient/appointments',
    actionLabel: 'View Appointments',
    duration: 5000,
  }),

  consultationStarted: (patientName?: string) => ({
    type: 'consultation' as const,
    status: 'info' as const,
    title: 'Consultation Started',
    message: patientName 
      ? `Your consultation with ${patientName} has started.`
      : 'Your consultation has started.',
    actionUrl: '#', // Will be set dynamically
    actionLabel: 'Join Consultation',
    duration: 8000,
  }),

  consultationCompleted: (earnings?: number) => ({
    type: 'consultation' as const,
    status: 'success' as const,
    title: 'Consultation Completed',
    message: earnings 
      ? `Consultation completed successfully. $${earnings} has been added to your earnings.`
      : 'Consultation completed successfully.',
    actionUrl: '/dashboard/doctor/earnings',
    actionLabel: 'View Earnings',
    duration: 6000,
  }),

  creditDeducted: (amount: number, remaining: number) => ({
    type: 'credit' as const,
    status: 'info' as const,
    title: 'Credits Used',
    message: `${amount} credits deducted. You have ${remaining} credits remaining.`,
    actionUrl: '/dashboard/patient/subscription',
    actionLabel: 'Manage Credits',
    duration: 5000,
  }),

  lowCreditWarning: (remaining: number) => ({
    type: 'credit' as const,
    status: 'warning' as const,
    title: 'Low Credit Balance',
    message: `You have only ${remaining} credits remaining. Consider purchasing more credits.`,
    actionUrl: '/dashboard/patient/subscription',
    actionLabel: 'Buy Credits',
    duration: 8000,
  }),

  paymentSuccessful: (amount: string, credits: number) => ({
    type: 'payment' as const,
    status: 'success' as const,
    title: 'Payment Successful',
    message: `Payment of ${amount} processed successfully. ${credits} credits added to your account.`,
    actionUrl: '/dashboard/patient/subscription',
    actionLabel: 'View Subscription',
    duration: 6000,
  }),

  paymentFailed: (reason?: string) => ({
    type: 'payment' as const,
    status: 'error' as const,
    title: 'Payment Failed',
    message: `Payment could not be processed.${reason ? ` Reason: ${reason}` : ''} Please try again or update your payment method.`,
    actionUrl: '/dashboard/patient/subscription',
    actionLabel: 'Update Payment',
    duration: 10000,
  }),

  doctorApplicationApproved: () => ({
    type: 'verification' as const,
    status: 'success' as const,
    title: 'Application Approved',
    message: 'Congratulations! Your doctor application has been approved. You can now start accepting patients.',
    actionUrl: '/dashboard/doctor',
    actionLabel: 'Go to Dashboard',
    duration: 8000,
  }),

  doctorApplicationRejected: (reason?: string) => ({
    type: 'verification' as const,
    status: 'error' as const,
    title: 'Application Rejected',
    message: `Your doctor application has been rejected.${reason ? ` Reason: ${reason}` : ''} Please review and resubmit.`,
    actionUrl: '/dashboard/doctor/apply',
    actionLabel: 'Review Application',
    duration: 10000,
  }),

  systemMaintenance: (duration?: string) => ({
    type: 'system' as const,
    status: 'warning' as const,
    title: 'System Maintenance',
    message: `System maintenance is scheduled${duration ? ` for ${duration}` : ''}. Some features may be temporarily unavailable.`,
    duration: 8000,
  }),
};

// Hook for easy status update notifications
export function useStatusUpdateToast() {
  return {
    showStatusUpdate: showStatusUpdateToast,
    templates: statusUpdateTemplates,
  };
}
