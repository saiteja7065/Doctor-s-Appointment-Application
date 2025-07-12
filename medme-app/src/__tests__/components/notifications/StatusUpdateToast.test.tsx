import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { 
  showStatusUpdateToast, 
  statusUpdateTemplates, 
  useStatusUpdateToast,
  StatusUpdateData 
} from '@/components/notifications/StatusUpdateToast';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock window.location
const mockLocation = {
  href: '',
  reload: jest.fn(),
  assign: jest.fn(),
  replace: jest.fn(),
};

// Store original location
const originalLocation = window.location;

beforeAll(() => {
  // @ts-ignore
  delete window.location;
  window.location = mockLocation as any;
});

afterAll(() => {
  window.location = originalLocation;
});

describe('StatusUpdateToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showStatusUpdateToast', () => {
    it('should call toast.success for success status', () => {
      const data: StatusUpdateData = {
        type: 'appointment',
        status: 'success',
        title: 'Test Success',
        message: 'Test message',
      };

      showStatusUpdateToast(data);

      expect(toast.success).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 5000,
          style: expect.objectContaining({
            borderLeft: '4px solid #10b981',
          }),
        })
      );
    });

    it('should call toast.error for error status', () => {
      const data: StatusUpdateData = {
        type: 'payment',
        status: 'error',
        title: 'Payment Failed',
        message: 'Payment could not be processed',
      };

      showStatusUpdateToast(data);

      expect(toast.error).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 8000,
          style: expect.objectContaining({
            borderLeft: '4px solid #ef4444',
          }),
        })
      );
    });

    it('should call toast.warning for warning status', () => {
      const data: StatusUpdateData = {
        type: 'credit',
        status: 'warning',
        title: 'Low Credits',
        message: 'You have low credit balance',
      };

      showStatusUpdateToast(data);

      expect(toast.warning).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 6000,
          style: expect.objectContaining({
            borderLeft: '4px solid #f59e0b',
          }),
        })
      );
    });

    it('should call toast.info for info status', () => {
      const data: StatusUpdateData = {
        type: 'consultation',
        status: 'info',
        title: 'Consultation Started',
        message: 'Your consultation has started',
      };

      showStatusUpdateToast(data);

      expect(toast.info).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 4000,
          style: expect.objectContaining({
            borderLeft: '4px solid #3b82f6',
          }),
        })
      );
    });

    it('should use custom duration when provided', () => {
      const data: StatusUpdateData = {
        type: 'appointment',
        status: 'success',
        title: 'Test',
        message: 'Test message',
        duration: 10000,
      };

      showStatusUpdateToast(data);

      expect(toast.success).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          duration: 10000,
        })
      );
    });
  });

  describe('statusUpdateTemplates', () => {
    it('should generate correct appointment booked template', () => {
      const template = statusUpdateTemplates.appointmentBooked('Dr. Smith', '2024-01-15');

      expect(template).toEqual({
        type: 'appointment',
        status: 'success',
        title: 'Appointment Booked Successfully',
        message: 'Your appointment with Dr. Dr. Smith on 2024-01-15 has been confirmed.',
        actionUrl: '/dashboard/patient/appointments',
        actionLabel: 'View Appointment',
        duration: 6000,
      });
    });

    it('should generate correct appointment cancelled template', () => {
      const template = statusUpdateTemplates.appointmentCancelled('Dr. Smith', true);

      expect(template).toEqual({
        type: 'appointment',
        status: 'info',
        title: 'Appointment Cancelled',
        message: 'Your appointment with Dr. Smith has been cancelled. Credits have been refunded to your account.',
        actionUrl: '/dashboard/patient/appointments',
        actionLabel: 'View Appointments',
        duration: 5000,
      });
    });

    it('should generate correct consultation started template', () => {
      const template = statusUpdateTemplates.consultationStarted('John Doe');

      expect(template).toEqual({
        type: 'consultation',
        status: 'info',
        title: 'Consultation Started',
        message: 'Your consultation with John Doe has started.',
        actionUrl: '#',
        actionLabel: 'Join Consultation',
        duration: 8000,
      });
    });

    it('should generate correct consultation completed template', () => {
      const template = statusUpdateTemplates.consultationCompleted(50);

      expect(template).toEqual({
        type: 'consultation',
        status: 'success',
        title: 'Consultation Completed',
        message: 'Consultation completed successfully. $50 has been added to your earnings.',
        actionUrl: '/dashboard/doctor/earnings',
        actionLabel: 'View Earnings',
        duration: 6000,
      });
    });

    it('should generate correct credit deducted template', () => {
      const template = statusUpdateTemplates.creditDeducted(2, 8);

      expect(template).toEqual({
        type: 'credit',
        status: 'info',
        title: 'Credits Used',
        message: '2 credits deducted. You have 8 credits remaining.',
        actionUrl: '/dashboard/patient/subscription',
        actionLabel: 'Manage Credits',
        duration: 5000,
      });
    });

    it('should generate correct low credit warning template', () => {
      const template = statusUpdateTemplates.lowCreditWarning(1);

      expect(template).toEqual({
        type: 'credit',
        status: 'warning',
        title: 'Low Credit Balance',
        message: 'You have only 1 credits remaining. Consider purchasing more credits.',
        actionUrl: '/dashboard/patient/subscription',
        actionLabel: 'Buy Credits',
        duration: 8000,
      });
    });

    it('should generate correct payment successful template', () => {
      const template = statusUpdateTemplates.paymentSuccessful('$29.99', 10);

      expect(template).toEqual({
        type: 'payment',
        status: 'success',
        title: 'Payment Successful',
        message: 'Payment of $29.99 processed successfully. 10 credits added to your account.',
        actionUrl: '/dashboard/patient/subscription',
        actionLabel: 'View Subscription',
        duration: 6000,
      });
    });

    it('should generate correct payment failed template', () => {
      const template = statusUpdateTemplates.paymentFailed('Insufficient funds');

      expect(template).toEqual({
        type: 'payment',
        status: 'error',
        title: 'Payment Failed',
        message: 'Payment could not be processed. Reason: Insufficient funds Please try again or update your payment method.',
        actionUrl: '/dashboard/patient/subscription',
        actionLabel: 'Update Payment',
        duration: 10000,
      });
    });

    it('should generate correct doctor application approved template', () => {
      const template = statusUpdateTemplates.doctorApplicationApproved();

      expect(template).toEqual({
        type: 'verification',
        status: 'success',
        title: 'Application Approved',
        message: 'Congratulations! Your doctor application has been approved. You can now start accepting patients.',
        actionUrl: '/dashboard/doctor',
        actionLabel: 'Go to Dashboard',
        duration: 8000,
      });
    });

    it('should generate correct doctor application rejected template', () => {
      const template = statusUpdateTemplates.doctorApplicationRejected('Invalid credentials');

      expect(template).toEqual({
        type: 'verification',
        status: 'error',
        title: 'Application Rejected',
        message: 'Your doctor application has been rejected. Reason: Invalid credentials Please review and resubmit.',
        actionUrl: '/dashboard/doctor/apply',
        actionLabel: 'Review Application',
        duration: 10000,
      });
    });

    it('should generate correct system maintenance template', () => {
      const template = statusUpdateTemplates.systemMaintenance('2 hours');

      expect(template).toEqual({
        type: 'system',
        status: 'warning',
        title: 'System Maintenance',
        message: 'System maintenance is scheduled for 2 hours. Some features may be temporarily unavailable.',
        duration: 8000,
      });
    });
  });

  describe('useStatusUpdateToast hook', () => {
    const TestComponent = () => {
      const { showStatusUpdate, templates } = useStatusUpdateToast();

      return (
        <div>
          <button
            onClick={() => showStatusUpdate({
              type: 'appointment',
              status: 'success',
              title: 'Test',
              message: 'Test message',
            })}
          >
            Show Toast
          </button>
          <button
            onClick={() => showStatusUpdate(templates.appointmentBooked('Dr. Test', '2024-01-15'))}
          >
            Show Template Toast
          </button>
        </div>
      );
    };

    it('should provide showStatusUpdate function', () => {
      render(<TestComponent />);

      const button = screen.getByText('Show Toast');
      fireEvent.click(button);

      expect(toast.success).toHaveBeenCalled();
    });

    it('should provide templates object', () => {
      render(<TestComponent />);

      const button = screen.getByText('Show Template Toast');
      fireEvent.click(button);

      expect(toast.success).toHaveBeenCalled();
    });
  });
});
