import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction, TransactionType, TransactionStatus } from '@/lib/models/Transaction';
import { retrieveCheckoutSession, SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '@/lib/stripe';
import { withPatientAuth } from '@/lib/auth/rbac';
import { sendEmail, EmailTemplate } from '@/lib/email';

// Handle successful payment completion
async function checkoutSuccessHandler(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    // Retrieve checkout session from Stripe
    const session = await retrieveCheckoutSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 400 }
      );
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Connect to database and get patient
    await connectToDatabase();
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if this session has already been processed
    const existingTransaction = await Transaction.findOne({
      stripeSessionId: sessionId,
    });

    if (existingTransaction) {
      return NextResponse.json({
        message: 'Payment already processed',
        transaction: existingTransaction,
        patient: {
          creditBalance: patient.creditBalance,
          subscriptionPlan: patient.subscriptionPlan,
          subscriptionStatus: patient.subscriptionStatus,
        },
      });
    }

    const metadata = session.metadata || {};
    const isDemo = sessionId.includes('demo');

    let creditsAdded = 0;
    let transactionType = TransactionType.PURCHASE;
    let description = '';
    let amount = 0;

    // Handle subscription payment
    if (metadata.planKey && SUBSCRIPTION_PLANS[metadata.planKey as keyof typeof SUBSCRIPTION_PLANS]) {
      const plan = SUBSCRIPTION_PLANS[metadata.planKey as keyof typeof SUBSCRIPTION_PLANS];
      creditsAdded = plan.credits;
      transactionType = TransactionType.SUBSCRIPTION;
      description = `${plan.name} subscription purchase`;
      amount = plan.price;

      // Update patient subscription
      patient.subscriptionPlan = metadata.planKey;
      patient.subscriptionStatus = 'active';
      patient.subscriptionStartDate = new Date();
      
      // Set subscription end date (monthly billing)
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      patient.subscriptionEndDate = endDate;

      if (!isDemo && session.subscription) {
        patient.stripeSubscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription.id;
      }
    }
    // Handle credit package payment
    else if (metadata.packageKey && CREDIT_PACKAGES[metadata.packageKey as keyof typeof CREDIT_PACKAGES]) {
      const creditPackage = CREDIT_PACKAGES[metadata.packageKey as keyof typeof CREDIT_PACKAGES];
      creditsAdded = creditPackage.credits;
      transactionType = TransactionType.PURCHASE;
      description = `${creditPackage.name} credit purchase`;
      amount = creditPackage.price;
    }
    // Handle legacy credits from metadata
    else if (metadata.credits) {
      creditsAdded = parseInt(metadata.credits);
      description = `${creditsAdded} credits purchase`;
      amount = session.amount_total || 0;
    }

    if (creditsAdded === 0) {
      return NextResponse.json(
        { error: 'Invalid payment session - no credits to add' },
        { status: 400 }
      );
    }

    // Add credits to patient balance
    patient.creditBalance += creditsAdded;
    await patient.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: patient.userId,
      clerkId: userId,
      patientId: patient._id,
      type: transactionType,
      status: TransactionStatus.COMPLETED,
      credits: creditsAdded,
      amount: amount / 100, // Convert cents to dollars
      description,
      stripeSessionId: sessionId,
      stripePaymentIntentId: session.payment_intent as string,
      metadata: {
        planKey: metadata.planKey,
        packageKey: metadata.packageKey,
        sessionData: isDemo ? { demo: true } : undefined,
      },
    });

    await transaction.save();

    // Send confirmation email
    try {
      const user = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

      const email = user.email_addresses?.[0]?.email_address;
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();

      if (email) {
        if (transactionType === TransactionType.SUBSCRIPTION) {
          await sendEmail({
            template: EmailTemplate.SUBSCRIPTION_RENEWAL,
            to: email,
            data: {
              patientName: name,
              planName: SUBSCRIPTION_PLANS[metadata.planKey as keyof typeof SUBSCRIPTION_PLANS]?.name || 'Subscription',
              creditsAdded,
              newBalance: patient.creditBalance,
              amount: amount / 100,
              renewalDate: patient.subscriptionEndDate?.toISOString().split('T')[0] || '',
            },
          });
        } else {
          await sendEmail({
            template: EmailTemplate.CREDIT_PURCHASE,
            to: email,
            data: {
              patientName: name,
              creditsAdded,
              newBalance: patient.creditBalance,
              amount: amount / 100,
              packageName: CREDIT_PACKAGES[metadata.packageKey as keyof typeof CREDIT_PACKAGES]?.name || 'Credits',
            },
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the payment processing if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      transaction: {
        id: transaction._id,
        type: transaction.type,
        credits: transaction.credits,
        amount: transaction.amount,
        description: transaction.description,
      },
      patient: {
        creditBalance: patient.creditBalance,
        subscriptionPlan: patient.subscriptionPlan,
        subscriptionStatus: patient.subscriptionStatus,
        subscriptionEndDate: patient.subscriptionEndDate,
      },
    });

  } catch (error) {
    console.error('Checkout success error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/payments/checkout-success
export const GET = withPatientAuth(checkoutSuccessHandler);
