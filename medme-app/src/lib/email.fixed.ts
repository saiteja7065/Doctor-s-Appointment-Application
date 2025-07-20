import { Resend } from 'resend';

// Cache the Resend client to avoid creating multiple instances
let resendClient: Resend | null = null;

/**
 * Get or create a Resend client
 * @returns Resend client or null if API key is not configured
 */
function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_demo_key_for_development') {
    // Don't warn in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Resend API key not configured or using demo key. Email functionality will be disabled.');
    }
    return null;
  }
  
  try {
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch (error) {
    console.error('Failed to initialize Resend client:', error);
    return null;
  }
}

/**
 * Send an email using Resend
 * @param to Recipient email address
 * @param subject Email subject
 * @param html Email HTML content
 * @param options Additional options
 * @returns Response with success status and message ID
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: {
    from?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
    }>;
  } = {}
) {
  // In test environment, just return success without logging
  if (process.env.NODE_ENV === 'test') {
    return { success: true, messageId: 'test_message_id' };
  }
  
  const client = getResendClient();
  if (!client) {
    // Don't warn in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Email service not available. Email will be logged instead.');
      console.log('Email would be sent:', { to, subject, html });
    }
    return { success: true, messageId: 'demo_message_id' };
  }

  try {
    const from = options.from || process.env.EMAIL_FROM || 'noreply@medme-app.com';
    
    const response = await client.emails.send({
      from,
      to,
      subject,
      html,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      attachments: options.attachments,
    });

    if ('error' in response) {
      console.error('Failed to send email:', response.error);
      return { success: false, error: response.error };
    }

    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
  role: string
) {
  const subject = 'Welcome to MedMe!';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to MedMe!</h1>
      </div>

      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName} ${lastName},</h2>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Thank you for joining MedMe! We're excited to have you on board.
        </p>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          You've registered as a <strong>${role}</strong>. Here's what you can do next:
        </p>

        ${
          role === 'patient'
            ? `
            <ul style="color: #666; font-size: 16px; line-height: 1.6;">
              <li>Complete your health profile</li>
              <li>Search for doctors by specialty</li>
              <li>Book video consultations</li>
              <li>Manage your appointments</li>
            </ul>
            `
            : role === 'doctor'
            ? `
            <ul style="color: #666; font-size: 16px; line-height: 1.6;">
              <li>Complete your professional profile</li>
              <li>Set your availability schedule</li>
              <li>Manage incoming appointment requests</li>
              <li>Conduct video consultations</li>
            </ul>
            `
            : ''
        }

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
             style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please don't hesitate to contact our support team.
        </p>

        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} MedMe. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send an appointment confirmation email
 */
export async function sendAppointmentConfirmationEmail(
  email: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
  consultationType: string,
  confirmationNumber: string
) {
  const subject = 'Your Appointment is Confirmed';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Appointment Confirmed</h1>
      </div>

      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${patientName},</h2>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your appointment has been confirmed with the following details:
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #333;">Appointment Details</h3>
          <p><strong>Doctor:</strong> ${doctorName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
          <p><strong>Type:</strong> ${consultationType}</p>
          <p><strong>Confirmation Number:</strong> ${confirmationNumber}</p>
        </div>

        <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #065f46;">Preparing for Your Appointment</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Be ready 5 minutes before your scheduled time</li>
            <li>Ensure you have a stable internet connection</li>
            <li>Find a quiet, private space for your consultation</li>
            <li>Have any relevant medical records or information ready</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/patient/appointments"
             style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Appointment
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you need to reschedule or cancel, please do so at least 24 hours in advance.
        </p>

        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} MedMe. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send a payment receipt email
 */
export async function sendPaymentReceiptEmail(
  email: string,
  customerName: string,
  amount: number,
  credits: number,
  transactionId: string,
  paymentMethod: string,
  date: string
) {
  const subject = 'Payment Receipt - MedMe Credits';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Payment Receipt</h1>
      </div>

      <div style="padding: 30px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${customerName},</h2>

        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Credits Purchased:</strong> ${credits}</p>
          <p><strong>Transaction ID:</strong> ${transactionId}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Date:</strong> ${date}</p>
        </div>

        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1e40af;">Your Credits Balance</h4>
          <p style="font-size: 24px; font-weight: bold; color: #1e40af; text-align: center;">
            ${credits} Credits
          </p>
          <p style="text-align: center;">
            You can use these credits to book consultations with our doctors.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/patient/appointments"
             style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Book Appointment
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions about this transaction, please contact our support team.
        </p>

        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #999; font-size: 12px;">
            © ${new Date().getFullYear()} MedMe. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send a payment failed notification email
 */
export async function sendPaymentFailedEmail(
  email: string,
  customerName: string,
  amount: number,
  planName: string,
  failureDate: string,
  reason: string
) {
  const subject = 'Payment Failed - Action Required';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">MedMe</h1>
        <p style="color: white; margin: 5px 0;">Payment Failed</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Payment Failed - Action Required</h2>

        <p>Dear ${customerName},</p>

        <p>We were unable to process your recent payment for your MedMe subscription. Your account has been temporarily suspended until payment is resolved.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #1e293b;">Payment Details</h3>
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Failed Date:</strong> ${failureDate}</p>
          <p><strong>Reason:</strong> ${reason}</p>
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
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/patient/subscription"
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method
          </a>
        </div>

        <p>If you continue to experience issues, please contact our support team for assistance.</p>

        <p>Best regards,<br>The MedMe Team</p>
      </div>

      <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MedMe. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send a low credit balance notification email
 */
export async function sendLowCreditBalanceEmail(
  email: string,
  customerName: string,
  currentBalance: number,
  creditsPerConsultation: number
) {
  const subject = 'Low Credit Balance - Time to Recharge';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">MedMe</h1>
        <p style="color: white; margin: 5px 0;">Low Credit Balance</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Your Credits Are Running Low</h2>

        <p>Dear ${customerName},</p>

        <p>You currently have only ${currentBalance} credits remaining in your account. To continue booking consultations with our doctors, you'll need to purchase more credits.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #1e293b;">Account Status</h3>
          <p><strong>Current Balance:</strong> ${currentBalance} credits</p>
          <p><strong>Credits per Consultation:</strong> ${creditsPerConsultation} credits</p>
          <p><strong>Remaining Consultations:</strong> ${Math.floor(currentBalance / creditsPerConsultation)}</p>
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
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/patient/subscription"
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Buy Credits Now
          </a>
        </div>

        <p>Don't let low credits interrupt your healthcare journey!</p>

        <p>Best regards,<br>The MedMe Team</p>
      </div>

      <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MedMe. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send a withdrawal request confirmation email
 */
export async function sendWithdrawalRequestEmail(
  email: string,
  doctorName: string,
  amount: number,
  requestId: string,
  requestDate: string,
  estimatedProcessingTime: string
) {
  const subject = 'Withdrawal Request Received';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">MedMe</h1>
        <p style="color: white; margin: 5px 0;">Withdrawal Request</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Withdrawal Request Received</h2>

        <p>Dear Dr. ${doctorName},</p>

        <p>We have received your withdrawal request. Your request is being processed and funds will be transferred to your account shortly.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
          <h3 style="margin-top: 0; color: #1e293b;">Withdrawal Details</h3>
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Request ID:</strong> ${requestId}</p>
          <p><strong>Request Date:</strong> ${requestDate}</p>
          <p><strong>Estimated Processing Time:</strong> ${estimatedProcessingTime}</p>
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
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/doctor/earnings"
             style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Track Request
          </a>
        </div>

        <p>If you have any questions, please don't hesitate to contact our support team.</p>

        <p>Best regards,<br>The MedMe Team</p>
      </div>

      <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MedMe. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send a doctor application status update email
 */
export async function sendDoctorApplicationStatusEmail(
  email: string,
  doctorName: string,
  status: 'approved' | 'rejected' | 'under_review' | 'requires_additional_info',
  message: string,
  applicationId: string
) {
  let subject = '';
  let headerColor = '';
  let headerText = '';
  let actionText = '';
  let actionUrl = '';
  
  switch (status) {
    case 'approved':
      subject = 'Doctor Application Approved!';
      headerColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      headerText = 'Application Approved';
      actionText = 'Complete Your Profile';
      actionUrl = '/dashboard/doctor/profile';
      break;
    case 'rejected':
      subject = 'Doctor Application Status Update';
      headerColor = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
      headerText = 'Application Not Approved';
      actionText = 'Contact Support';
      actionUrl = '/support';
      break;
    case 'under_review':
      subject = 'Doctor Application Under Review';
      headerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      headerText = 'Application Under Review';
      actionText = 'Check Status';
      actionUrl = '/dashboard';
      break;
    case 'requires_additional_info':
      subject = 'Doctor Application - Additional Information Required';
      headerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      headerText = 'Additional Information Required';
      actionText = 'Update Application';
      actionUrl = '/dashboard/doctor/application';
      break;
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${headerColor}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">MedMe</h1>
        <p style="color: white; margin: 5px 0;">${headerText}</p>
      </div>

      <div style="padding: 30px; background: #f8fafc;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Doctor Application Update</h2>

        <p>Dear Dr. ${doctorName},</p>

        <p>Your application to join MedMe as a healthcare provider has been ${status.replace('_', ' ')}.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #64748b;">
          <h3 style="margin-top: 0; color: #1e293b;">Application Details</h3>
          <p><strong>Application ID:</strong> ${applicationId}</p>
          <p><strong>Status:</strong> ${status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          <p><strong>Message:</strong> ${message}</p>
        </div>

        ${
          status === 'approved'
            ? `
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #065f46;">Next Steps</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Complete your doctor profile</li>
                <li>Set your availability schedule</li>
                <li>Configure your consultation fees</li>
                <li>Start accepting patient appointments</li>
              </ul>
            </div>
            `
            : status === 'requires_additional_info'
            ? `
            <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #9a3412;">Additional Information Required</h4>
              <p>Please log in to your account and provide the requested information to continue with your application.</p>
            </div>
            `
            : ''
        }

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}${actionUrl}"
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${actionText}
          </a>
        </div>

        <p>If you have any questions, please don't hesitate to contact our support team.</p>

        <p>Best regards,<br>The MedMe Team</p>
      </div>

      <div style="background: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} MedMe. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendAppointmentConfirmationEmail,
  sendPaymentReceiptEmail,
  sendPaymentFailedEmail,
  sendLowCreditBalanceEmail,
  sendWithdrawalRequestEmail,
  sendDoctorApplicationStatusEmail,
};