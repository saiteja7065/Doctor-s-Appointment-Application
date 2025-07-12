import {
  sendAppointmentConfirmation,
  sendPaymentConfirmation,
  sendSubscriptionActivated,
  sendCreditDeductionNotification,
  sendRefundNotification,
  sendLowCreditWarning,
  sendDoctorEarningsNotification,
  sendWithdrawalRequestConfirmation,
  sendPaymentFailedNotification,
  emailTemplates
} from '@/lib/email';

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'test-email-id' }
      })
    }
  }))
}));

describe('Email Notification System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set demo mode for testing
    process.env.RESEND_API_KEY = '';
  });

  describe('Email Templates', () => {
    test('should have all required email templates', () => {
      expect(emailTemplates.appointmentConfirmation).toBeDefined();
      expect(emailTemplates.paymentConfirmation).toBeDefined();
      expect(emailTemplates.subscriptionActivated).toBeDefined();
      expect(emailTemplates.creditDeduction).toBeDefined();
      expect(emailTemplates.refundNotification).toBeDefined();
      expect(emailTemplates.lowCreditWarning).toBeDefined();
      expect(emailTemplates.doctorEarningsNotification).toBeDefined();
      expect(emailTemplates.withdrawalRequestConfirmation).toBeDefined();
      expect(emailTemplates.paymentFailed).toBeDefined();
    });

    test('should render appointment confirmation template correctly', () => {
      const data = {
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        specialty: 'Cardiology',
        appointmentDate: '2024-01-15',
        appointmentTime: '10:00 AM',
        consultationType: 'video',
        cost: 2
      };

      const html = emailTemplates.appointmentConfirmation.template(data);
      
      expect(html).toContain('John Doe');
      expect(html).toContain('Dr. Smith');
      expect(html).toContain('Cardiology');
      expect(html).toContain('2024-01-15');
      expect(html).toContain('10:00 AM');
      expect(html).toContain('video');
    });

    test('should render credit deduction template with low balance warning', () => {
      const data = {
        patientName: 'Jane Doe',
        doctorName: 'Dr. Johnson',
        appointmentDate: '2024-01-15',
        creditsUsed: 2,
        remainingCredits: 1
      };

      const html = emailTemplates.creditDeduction.template(data);
      
      expect(html).toContain('Jane Doe');
      expect(html).toContain('Dr. Johnson');
      expect(html).toContain('2 credits');
      expect(html).toContain('1 credits remaining');
      expect(html).toContain('Low Credit Balance'); // Should show warning
    });

    test('should render doctor earnings notification template', () => {
      const data = {
        doctorName: 'Dr. Smith',
        patientName: 'John Doe',
        consultationDate: '2024-01-15',
        duration: 30,
        earningsAmount: 50,
        totalEarnings: 1500,
        availableBalance: 1200,
        monthlyEarnings: 800
      };

      const html = emailTemplates.doctorEarningsNotification.template(data);
      
      expect(html).toContain('Dr. Smith');
      expect(html).toContain('John Doe');
      expect(html).toContain('$50');
      expect(html).toContain('$1500');
      expect(html).toContain('$1200');
      expect(html).toContain('$800');
    });
  });

  describe('Email Sending Functions', () => {
    test('should send appointment confirmation email', async () => {
      const data = {
        patientEmail: 'patient@test.com',
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        specialty: 'Cardiology',
        appointmentDate: '2024-01-15',
        appointmentTime: '10:00 AM',
        consultationType: 'video',
        cost: 2
      };

      const result = await sendAppointmentConfirmation(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });

    test('should send credit deduction notification', async () => {
      const data = {
        patientEmail: 'patient@test.com',
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        appointmentDate: '2024-01-15',
        creditsUsed: 2,
        remainingCredits: 3
      };

      const result = await sendCreditDeductionNotification(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });

    test('should send refund notification', async () => {
      const data = {
        patientEmail: 'patient@test.com',
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        appointmentDate: '2024-01-15',
        refundAmount: 2,
        newBalance: 5,
        cancellationDate: '2024-01-14'
      };

      const result = await sendRefundNotification(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });

    test('should send low credit warning', async () => {
      const data = {
        patientEmail: 'patient@test.com',
        patientName: 'John Doe',
        currentCredits: 1
      };

      const result = await sendLowCreditWarning(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });

    test('should send doctor earnings notification', async () => {
      const data = {
        doctorEmail: 'doctor@test.com',
        doctorName: 'Dr. Smith',
        patientName: 'John Doe',
        consultationDate: '2024-01-15',
        duration: 30,
        earningsAmount: 50,
        totalEarnings: 1500,
        availableBalance: 1200,
        monthlyEarnings: 800
      };

      const result = await sendDoctorEarningsNotification(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });

    test('should send withdrawal request confirmation', async () => {
      const data = {
        doctorEmail: 'doctor@test.com',
        doctorName: 'Dr. Smith',
        requestId: 'withdraw_123456',
        amount: 500,
        withdrawalMethod: 'Bank Transfer',
        requestDate: '2024-01-15'
      };

      const result = await sendWithdrawalRequestConfirmation(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });

    test('should send payment failed notification', async () => {
      const data = {
        customerEmail: 'patient@test.com',
        customerName: 'John Doe',
        amount: '$19.99',
        planName: 'Basic Plan',
        failedDate: '2024-01-15',
        failureReason: 'Insufficient funds'
      };

      const result = await sendPaymentFailedNotification(data);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('demo_message_id');
    });
  });

  describe('Error Handling', () => {
    test('should handle email sending errors gracefully', async () => {
      // Mock an error scenario
      const mockError = new Error('Email service unavailable');
      jest.doMock('resend', () => ({
        Resend: jest.fn().mockImplementation(() => ({
          emails: {
            send: jest.fn().mockRejectedValue(mockError)
          }
        }))
      }));

      const data = {
        patientEmail: 'patient@test.com',
        patientName: 'John Doe',
        currentCredits: 1
      };

      // In demo mode, should still return success
      const result = await sendLowCreditWarning(data);
      expect(result.success).toBe(true);
    });
  });
});
