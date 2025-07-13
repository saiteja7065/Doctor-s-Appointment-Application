import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe, formatPrice } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction } from '@/lib/models/Transaction';

interface PaymentMethod {
  id: string;
  type: 'card';
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface PaymentSettings {
  autoRecharge: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  receiptEmails: boolean;
  lowBalanceAlerts: boolean;
  subscriptionReminders: boolean;
}

interface BillingHistory {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

/**
 * GET /api/payments/settings
 * Get payment settings, methods, and billing history for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo data for development
      const demoData = {
        paymentMethods: [
          {
            id: 'pm_demo_1',
            type: 'card',
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2025,
            isDefault: true,
            billingAddress: {
              line1: '123 Main St',
              city: 'New York',
              state: 'NY',
              postalCode: '10001',
              country: 'US'
            }
          }
        ],
        settings: {
          autoRecharge: false,
          autoRechargeThreshold: 2,
          autoRechargeAmount: 10,
          emailNotifications: true,
          smsNotifications: false,
          receiptEmails: true,
          lowBalanceAlerts: true,
          subscriptionReminders: true
        },
        billingHistory: [
          {
            id: 'inv_demo_1',
            date: new Date().toISOString(),
            description: 'Premium Plan Subscription',
            amount: 60.00,
            status: 'paid',
            downloadUrl: '/api/invoices/demo_1/download'
          }
        ]
      };

      return NextResponse.json({
        success: true,
        ...demoData,
        message: 'Demo payment settings data'
      });
    }

    // Find patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    let paymentMethods: PaymentMethod[] = [];
    let billingHistory: BillingHistory[] = [];

    // Get payment methods from Stripe if customer exists
    if (patient.stripeCustomerId) {
      try {
        const stripePaymentMethods = await stripe.paymentMethods.list({
          customer: patient.stripeCustomerId,
          type: 'card',
        });

        // Get default payment method
        const customer = await stripe.customers.retrieve(patient.stripeCustomerId);
        const defaultPaymentMethodId = typeof customer !== 'string' && customer.invoice_settings?.default_payment_method;

        paymentMethods = stripePaymentMethods.data.map(pm => ({
          id: pm.id,
          type: 'card',
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '0000',
          expiryMonth: pm.card?.exp_month || 1,
          expiryYear: pm.card?.exp_year || 2025,
          isDefault: pm.id === defaultPaymentMethodId,
          billingAddress: pm.billing_details?.address ? {
            line1: pm.billing_details.address.line1 || '',
            city: pm.billing_details.address.city || '',
            state: pm.billing_details.address.state || '',
            postalCode: pm.billing_details.address.postal_code || '',
            country: pm.billing_details.address.country || ''
          } : undefined
        }));

        // Get billing history from Stripe invoices
        const invoices = await stripe.invoices.list({
          customer: patient.stripeCustomerId,
          limit: 20,
        });

        billingHistory = invoices.data.map(invoice => ({
          id: invoice.id,
          date: new Date(invoice.created * 1000).toISOString(),
          description: invoice.description || 'Subscription payment',
          amount: invoice.amount_paid / 100, // Convert from cents
          status: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' ? 'pending' : 'failed',
          downloadUrl: invoice.invoice_pdf || undefined
        }));
      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError);
        // Continue with empty arrays
      }
    }

    // Get payment settings from patient document
    const settings: PaymentSettings = {
      autoRecharge: patient.paymentSettings?.autoRecharge || false,
      autoRechargeThreshold: patient.paymentSettings?.autoRechargeThreshold || 2,
      autoRechargeAmount: patient.paymentSettings?.autoRechargeAmount || 10,
      emailNotifications: patient.paymentSettings?.emailNotifications !== false,
      smsNotifications: patient.paymentSettings?.smsNotifications || false,
      receiptEmails: patient.paymentSettings?.receiptEmails !== false,
      lowBalanceAlerts: patient.paymentSettings?.lowBalanceAlerts !== false,
      subscriptionReminders: patient.paymentSettings?.subscriptionReminders !== false
    };

    return NextResponse.json({
      success: true,
      paymentMethods,
      settings,
      billingHistory
    });

  } catch (error) {
    console.error('Error in payment settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payments/settings
 * Update payment settings for the current user
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings object required' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Find and update patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Update payment settings
    patient.paymentSettings = {
      ...patient.paymentSettings,
      ...settings
    };

    await patient.save();

    return NextResponse.json({
      success: true,
      message: 'Payment settings updated successfully',
      settings: patient.paymentSettings
    });

  } catch (error) {
    console.error('Error in payment settings PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
