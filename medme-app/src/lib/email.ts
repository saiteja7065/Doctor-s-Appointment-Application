import { Resend } from 'resend';

// Initialize Resend client with error handling
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_demo_key_for_development') {
      console.warn('Resend API key not configured or using demo key. Email functionality will be disabled.');
      return null;
    }
    try {
      resend = new Resend(apiKey);
    } catch (error) {
      console.error('Failed to initialize Resend client:', error);
      return null;
    }
  }
  return resend;
}

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'MedMe <noreply@medme.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@medme.com',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

// Email template types
export enum EmailTemplate {
  APPOINTMENT_CONFIRMATION = 'appointmentConfirmation',
  APPOINTMENT_REMINDER = 'appointmentReminder',
  PAYMENT_CONFIRMATION = 'paymentConfirmation',
  SUBSCRIPTION_ACTIVATED = 'subscriptionActivated',
  CREDIT_DEDUCTION = 'creditDeduction',
  REFUND_NOTIFICATION = 'refundNotification',
  LOW_CREDIT_WARNING = 'lowCreditWarning',
  DOCTOR_EARNINGS_NOTIFICATION = 'doctorEarningsNotification',
  WITHDRAWAL_REQUEST_CONFIRMATION = 'withdrawalRequestConfirmation',
  PAYMENT_FAILED = 'paymentFailed',
  DOCTOR_APPLICATION_APPROVED = 'doctorApplicationApproved',
  DOCTOR_APPLICATION_REJECTED = 'doctorApplicationRejected',
  DOCTOR_APPLICATION_ADDITIONAL_INFO = 'doctorApplicationAdditionalInfo'
}

// Email templates
export const emailTemplates = {
  appointmentConfirmation: {
    subject: 'Appointment Confirmed - MedMe',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Your Healthcare Partner</p>
        </div>
        
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Appointment Confirmed</h2>
          
          <p>Dear ${data.patientName},</p>
          
          <p>Your appointment has been successfully confirmed. Here are the details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2;">
            <h3 style="margin-top: 0; color: #1e293b;">Appointment Details</h3>
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p><strong>Specialty:</strong> ${data.specialty}</p>
            <p><strong>Date:</strong> ${data.appointmentDate}</p>
            <p><strong>Time:</strong> ${data.appointmentTime}</p>
            <p><strong>Type:</strong> ${data.consultationType}</p>
            <p><strong>Cost:</strong> ${data.cost} credits</p>
          </div>
          
          ${data.consultationType === 'video' ? `
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">Video Consultation Instructions</h4>
            <p>Your video consultation link will be available 15 minutes before your appointment time.</p>
            <p>Please ensure you have a stable internet connection and test your camera/microphone beforehand.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/appointments" 
               style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Appointment
            </a>
          </div>
          
          <p>If you need to reschedule or cancel your appointment, please do so at least 24 hours in advance.</p>
          
          <p>Best regards,<br>The MedMe Team</p>
        </div>
        
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
          <p>If you have any questions, contact us at ${emailConfig.replyTo}</p>
        </div>
      </div>
    `
  },

  appointmentReminder: {
    subject: 'Appointment Reminder - Tomorrow at {time}',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Appointment Reminder</p>
        </div>
        
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Don't Forget Your Appointment</h2>
          
          <p>Dear ${data.patientName},</p>
          
          <p>This is a friendly reminder about your upcoming appointment:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #1e293b;">Tomorrow's Appointment</h3>
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p><strong>Time:</strong> ${data.appointmentTime}</p>
            <p><strong>Type:</strong> ${data.consultationType}</p>
          </div>
          
          ${data.consultationType === 'video' ? `
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #1e40af;">Video Consultation Ready</h4>
            <p>Your video consultation link will be available 15 minutes before your appointment.</p>
            <a href="${emailConfig.baseUrl}/consultation/${data.sessionId}" 
               style="background: #1e40af; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Join Video Call
            </a>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/appointments" 
               style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Appointments
            </a>
          </div>
          
          <p>Best regards,<br>The MedMe Team</p>
        </div>
        
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  paymentConfirmation: {
    subject: 'Payment Confirmation - MedMe',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Payment Confirmation</p>
        </div>
        
        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Payment Successful</h2>
          
          <p>Dear ${data.customerName},</p>
          
          <p>Thank you for your payment. Your transaction has been processed successfully.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #1e293b;">Transaction Details</h3>
            <p><strong>Amount:</strong> ${data.amount}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            ${data.type === 'credits' ? `<p><strong>Credits Added:</strong> ${data.credits}</p>` : ''}
            ${data.type === 'subscription' ? `<p><strong>Plan:</strong> ${data.planName}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/subscription" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Account
            </a>
          </div>
          
          <p>Your credits are now available and ready to use for consultations.</p>
          
          <p>Best regards,<br>The MedMe Team</p>
        </div>
        
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  subscriptionActivated: {
    subject: 'Subscription Activated - Welcome to {planName}',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Subscription Activated</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Welcome to ${data.planName}!</h2>

          <p>Dear ${data.customerName},</p>

          <p>Your subscription has been successfully activated. You now have access to all the benefits of your plan.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="margin-top: 0; color: #1e293b;">Subscription Details</h3>
            <p><strong>Plan:</strong> ${data.planName}</p>
            <p><strong>Monthly Credits:</strong> ${data.credits}</p>
            <p><strong>Next Billing Date:</strong> ${data.nextBillingDate}</p>
            <p><strong>Amount:</strong> ${data.amount}/month</p>
          </div>

          <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #6b21a8;">Your Benefits Include:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${data.features.map((feature: string) => `<li>${feature}</li>`).join('')}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/doctors"
               style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Find Doctors
            </a>
          </div>

          <p>Start booking consultations with our verified doctors today!</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  creditDeduction: {
    subject: 'Credits Used - Appointment Booked',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Credits Used</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Credits Deducted for Appointment</h2>

          <p>Dear ${data.patientName},</p>

          <p>Your appointment has been successfully booked and ${data.creditsUsed} credits have been deducted from your account.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #1e293b;">Transaction Details</h3>
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p><strong>Appointment Date:</strong> ${data.appointmentDate}</p>
            <p><strong>Credits Used:</strong> ${data.creditsUsed}</p>
            <p><strong>Remaining Balance:</strong> ${data.remainingCredits} credits</p>
          </div>

          ${data.remainingCredits <= 2 ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="margin-top: 0; color: #92400e;">Low Credit Balance</h4>
            <p>You have ${data.remainingCredits} credits remaining. Consider purchasing more credits to continue booking consultations.</p>
            <a href="${emailConfig.baseUrl}/dashboard/patient/subscription"
               style="background: #f59e0b; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
              Buy More Credits
            </a>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/appointments"
               style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Appointment
            </a>
          </div>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  refundNotification: {
    subject: 'Refund Processed - Appointment Cancelled',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Refund Processed</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Appointment Cancelled - Refund Issued</h2>

          <p>Dear ${data.patientName},</p>

          <p>Your appointment has been cancelled and a refund has been processed to your account.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #1e293b;">Refund Details</h3>
            <p><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
            <p><strong>Original Appointment:</strong> ${data.appointmentDate}</p>
            <p><strong>Credits Refunded:</strong> ${data.refundAmount}</p>
            <p><strong>New Balance:</strong> ${data.newBalance} credits</p>
            <p><strong>Cancellation Date:</strong> ${data.cancellationDate}</p>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #065f46;">Refund Policy</h4>
            <p>Since you cancelled more than 24 hours before your appointment, you received a full refund. The credits are now available in your account.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/doctors"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Book New Appointment
            </a>
          </div>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  lowCreditWarning: {
    subject: 'Low Credit Balance - Time to Recharge',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Low Credit Balance</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Your Credits Are Running Low</h2>

          <p>Dear ${data.patientName},</p>

          <p>You currently have only ${data.currentCredits} credits remaining in your account. To continue booking consultations with our doctors, you'll need to purchase more credits.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #1e293b;">Account Status</h3>
            <p><strong>Current Balance:</strong> ${data.currentCredits} credits</p>
            <p><strong>Credits per Consultation:</strong> 2 credits</p>
            <p><strong>Remaining Consultations:</strong> ${Math.floor(data.currentCredits / 2)}</p>
          </div>

          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #991b1b;">Quick Credit Options</h4>
            <p>Choose from our convenient credit packages:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>5 Credits - $9.99</li>
              <li>10 Credits - $19.99</li>
              <li>20 Credits - $39.99</li>
              <li>50 Credits - $99.99</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/subscription"
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Buy Credits Now
            </a>
          </div>

          <p>Don't let low credits interrupt your healthcare journey!</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  doctorEarningsNotification: {
    subject: 'Consultation Completed - Earnings Added',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Earnings Update</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Consultation Completed - Earnings Added</h2>

          <p>Dear Dr. ${data.doctorName},</p>

          <p>Congratulations! You've successfully completed a consultation and your earnings have been updated.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="margin-top: 0; color: #1e293b;">Consultation Details</h3>
            <p><strong>Patient:</strong> ${data.patientName}</p>
            <p><strong>Date:</strong> ${data.consultationDate}</p>
            <p><strong>Duration:</strong> ${data.duration} minutes</p>
            <p><strong>Earnings:</strong> $${data.earningsAmount}</p>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #065f46;">Updated Earnings Summary</h4>
            <p><strong>Total Earnings:</strong> $${data.totalEarnings}</p>
            <p><strong>Available for Withdrawal:</strong> $${data.availableBalance}</p>
            <p><strong>This Month:</strong> $${data.monthlyEarnings}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/doctor/earnings"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Earnings
            </a>
          </div>

          <p>Keep up the excellent work providing quality healthcare!</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  withdrawalRequestConfirmation: {
    subject: 'Withdrawal Request Received',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Withdrawal Request</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Withdrawal Request Received</h2>

          <p>Dear Dr. ${data.doctorName},</p>

          <p>We've received your withdrawal request and it's currently being processed by our finance team.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="margin-top: 0; color: #1e293b;">Withdrawal Details</h3>
            <p><strong>Request ID:</strong> ${data.requestId}</p>
            <p><strong>Amount:</strong> $${data.amount}</p>
            <p><strong>Method:</strong> ${data.withdrawalMethod}</p>
            <p><strong>Request Date:</strong> ${data.requestDate}</p>
            <p><strong>Status:</strong> Pending Review</p>
          </div>

          <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #6b21a8;">What Happens Next?</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Our finance team will review your request within 1-2 business days</li>
              <li>You'll receive an email confirmation once approved</li>
              <li>Funds will be transferred to your account within 3-5 business days</li>
              <li>You can track the status in your earnings dashboard</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/doctor/earnings"
               style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Track Request
            </a>
          </div>

          <p>If you have any questions, please don't hesitate to contact our support team.</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  paymentFailed: {
    subject: 'Payment Failed - Action Required',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Payment Failed</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Payment Failed - Action Required</h2>

          <p>Dear ${data.customerName},</p>

          <p>We were unable to process your recent payment for your MedMe subscription. Your account has been temporarily suspended until payment is resolved.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #1e293b;">Payment Details</h3>
            <p><strong>Amount:</strong> ${data.amount}</p>
            <p><strong>Plan:</strong> ${data.planName}</p>
            <p><strong>Failed Date:</strong> ${data.failedDate}</p>
            <p><strong>Reason:</strong> ${data.failureReason || 'Payment method declined'}</p>
          </div>

          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #991b1b;">What You Need to Do:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Update your payment method in your account settings</li>
              <li>Ensure your card has sufficient funds</li>
              <li>Contact your bank if the issue persists</li>
              <li>Retry the payment to restore your subscription</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${emailConfig.baseUrl}/dashboard/patient/subscription"
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Update Payment Method
            </a>
          </div>

          <p>If you continue to experience issues, please contact our support team for assistance.</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  doctorApplicationApproved: {
    subject: 'Doctor Application Approved - Welcome to MedMe!',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Application Approved</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">🎉 Congratulations! Your Application Has Been Approved</h2>

          <p>Dear ${data.doctorName},</p>

          <p>We are excited to inform you that your doctor application has been approved! Welcome to the MedMe healthcare platform.</p>

          <div style="background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 10px 0;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Complete your doctor profile setup</li>
              <li>Set your availability schedule</li>
              <li>Start accepting patient consultations</li>
              <li>Begin earning from your expertise</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl}"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Doctor Dashboard
            </a>
          </div>

          <p>As an approved doctor on MedMe, you can now:</p>
          <ul>
            <li>Conduct video consultations with patients</li>
            <li>Manage your appointment schedule</li>
            <li>Earn competitive fees for your services</li>
            <li>Access our comprehensive patient management tools</li>
          </ul>

          <p>If you have any questions or need assistance getting started, please don't hesitate to contact our support team at ${data.supportEmail}.</p>

          <p>Welcome aboard!</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  doctorApplicationRejected: {
    subject: 'Doctor Application Update - MedMe',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Application Update</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Application Status Update</h2>

          <p>Dear ${data.doctorName},</p>

          <p>Thank you for your interest in joining the MedMe healthcare platform. After careful review of your application, we regret to inform you that we are unable to approve your application at this time.</p>

          <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">Reason for Decision:</h3>
            <p style="margin: 5px 0;">${data.reason}</p>
          </div>

          <p>We encourage you to review our requirements and consider reapplying in the future if your circumstances change. Our platform maintains high standards to ensure the best possible care for our patients.</p>

          <div style="background: #dbeafe; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">Need Assistance?</h3>
            <p style="margin: 5px 0;">If you have questions about this decision or would like guidance on reapplying, please contact our support team at ${data.supportEmail}.</p>
          </div>

          <p>We appreciate your interest in MedMe and wish you the best in your medical practice.</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  },

  doctorApplicationAdditionalInfo: {
    subject: 'Additional Information Required - Doctor Application',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">MedMe</h1>
          <p style="color: white; margin: 5px 0;">Additional Information Required</p>
        </div>

        <div style="padding: 30px; background: #f8fafc;">
          <h2 style="color: #1e293b; margin-bottom: 20px;">Action Required: Additional Information Needed</h2>

          <p>Dear ${data.doctorName},</p>

          <p>Thank you for your doctor application to MedMe. We are currently reviewing your submission and require some additional information to complete the verification process.</p>

          ${data.requestedChanges && data.requestedChanges.length > 0 ? `
          <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #d97706; margin: 0 0 10px 0;">Required Updates:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              ${data.requestedChanges.map((change: string) => `<li>${change}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${data.comments ? `
          <div style="background: #e0f2fe; border: 1px solid #b3e5fc; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #0277bd; margin: 0 0 10px 0;">Additional Comments:</h3>
            <p style="margin: 5px 0;">${data.comments}</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.applicationUrl}"
               style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Update Application
            </a>
          </div>

          <p>Please log in to your account and provide the requested information. Once submitted, our team will review your updated application promptly.</p>

          <p>If you have any questions about the required updates, please contact our support team at ${data.supportEmail}.</p>

          <p>Thank you for your patience and cooperation.</p>

          <p>Best regards,<br>The MedMe Team</p>
        </div>

        <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2024 MedMe. All rights reserved.</p>
        </div>
      </div>
    `
  }
};

/**
 * Send an email using Resend
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options?: {
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getResendClient();
    if (!client) {
      console.warn('Email service not available. Email will be logged instead.');
      console.log('Email would be sent:', { to, subject, html });
      return { success: true, messageId: 'demo_message_id' };
    }

    const result = await client.emails.send({
      from: options?.from || emailConfig.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: options?.replyTo || emailConfig.replyTo,
      cc: options?.cc,
      bcc: options?.bcc,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: string;
  cost: number;
}) {
  const template = emailTemplates.appointmentConfirmation;
  const html = template.template(data);
  
  return await sendEmail(
    data.patientEmail,
    template.subject,
    html
  );
}

/**
 * Send appointment reminder email
 */
export async function sendAppointmentReminder(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  consultationType: string;
  sessionId?: string;
}) {
  const template = emailTemplates.appointmentReminder;
  const subject = template.subject.replace('{time}', data.appointmentTime);
  const html = template.template(data);
  
  return await sendEmail(
    data.patientEmail,
    subject,
    html
  );
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(data: {
  customerEmail: string;
  customerName: string;
  amount: string;
  transactionId: string;
  date: string;
  paymentMethod: string;
  type: 'credits' | 'subscription';
  credits?: number;
  planName?: string;
}) {
  const template = emailTemplates.paymentConfirmation;
  const html = template.template(data);
  
  return await sendEmail(
    data.customerEmail,
    template.subject,
    html
  );
}

/**
 * Send subscription activation email
 */
export async function sendSubscriptionActivated(data: {
  customerEmail: string;
  customerName: string;
  planName: string;
  credits: number;
  nextBillingDate: string;
  amount: string;
  features: string[];
}) {
  const template = emailTemplates.subscriptionActivated;
  const subject = template.subject.replace('{planName}', data.planName);
  const html = template.template(data);

  return await sendEmail(
    data.customerEmail,
    subject,
    html
  );
}

/**
 * Send credit deduction notification email
 */
export async function sendCreditDeductionNotification(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  creditsUsed: number;
  remainingCredits: number;
}) {
  const template = emailTemplates.creditDeduction;
  const html = template.template(data);

  return await sendEmail(
    data.patientEmail,
    template.subject,
    html
  );
}

/**
 * Send refund notification email
 */
export async function sendRefundNotification(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  refundAmount: number;
  newBalance: number;
  cancellationDate: string;
}) {
  const template = emailTemplates.refundNotification;
  const html = template.template(data);

  return await sendEmail(
    data.patientEmail,
    template.subject,
    html
  );
}

/**
 * Send low credit warning email
 */
export async function sendLowCreditWarning(data: {
  patientEmail: string;
  patientName: string;
  currentCredits: number;
}) {
  const template = emailTemplates.lowCreditWarning;
  const html = template.template(data);

  return await sendEmail(
    data.patientEmail,
    template.subject,
    html
  );
}

/**
 * Send doctor earnings notification email
 */
export async function sendDoctorEarningsNotification(data: {
  doctorEmail: string;
  doctorName: string;
  patientName: string;
  consultationDate: string;
  duration: number;
  earningsAmount: number;
  totalEarnings: number;
  availableBalance: number;
  monthlyEarnings: number;
}) {
  const template = emailTemplates.doctorEarningsNotification;
  const html = template.template(data);

  return await sendEmail(
    data.doctorEmail,
    template.subject,
    html
  );
}

/**
 * Send withdrawal request confirmation email
 */
export async function sendWithdrawalRequestConfirmation(data: {
  doctorEmail: string;
  doctorName: string;
  requestId: string;
  amount: number;
  withdrawalMethod: string;
  requestDate: string;
}) {
  const template = emailTemplates.withdrawalRequestConfirmation;
  const html = template.template(data);

  return await sendEmail(
    data.doctorEmail,
    template.subject,
    html
  );
}

/**
 * Send payment failed notification email
 */
export async function sendPaymentFailedNotification(data: {
  customerEmail: string;
  customerName: string;
  amount: string;
  planName: string;
  failedDate: string;
  failureReason?: string;
}) {
  const template = emailTemplates.paymentFailed;
  const html = template.template(data);

  return await sendEmail(
    data.customerEmail,
    template.subject,
    html
  );
}

/**
 * Send doctor application approved email
 */
export async function sendDoctorApplicationApproved(data: {
  doctorEmail: string;
  doctorName: string;
  loginUrl: string;
  supportEmail: string;
}) {
  const template = emailTemplates.doctorApplicationApproved;
  const html = template.template(data);

  return await sendEmail(
    data.doctorEmail,
    template.subject,
    html
  );
}

/**
 * Send doctor application rejected email
 */
export async function sendDoctorApplicationRejected(data: {
  doctorEmail: string;
  doctorName: string;
  reason: string;
  supportEmail: string;
}) {
  const template = emailTemplates.doctorApplicationRejected;
  const html = template.template(data);

  return await sendEmail(
    data.doctorEmail,
    template.subject,
    html
  );
}

/**
 * Send doctor application additional info required email
 */
export async function sendDoctorApplicationAdditionalInfo(data: {
  doctorEmail: string;
  doctorName: string;
  requestedChanges: string[];
  comments: string;
  applicationUrl: string;
  supportEmail: string;
}) {
  const template = emailTemplates.doctorApplicationAdditionalInfo;
  const html = template.template(data);

  return await sendEmail(
    data.doctorEmail,
    template.subject,
    html
  );
}

/**
 * Generic email sender with template support
 */
export async function sendEmailWithTemplate(options: {
  template: EmailTemplate;
  to: string;
  data: any;
}) {
  const { template, to, data } = options;
  const emailTemplate = emailTemplates[template];

  if (!emailTemplate) {
    throw new Error(`Email template '${template}' not found`);
  }

  const html = emailTemplate.template(data);
  const subject = emailTemplate.subject;

  return await sendEmail(to, subject, html);
}
