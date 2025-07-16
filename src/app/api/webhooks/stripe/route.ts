import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction, TransactionType, TransactionStatus } from '@/lib/models/Transaction';
import { verifyWebhookSignature, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { sendEmail, EmailTemplate } from '@/lib/email';
import Stripe from 'stripe';

// Handle Stripe webhook events
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);
    if (!event) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`Processing Stripe webhook: ${event.type}`);

    await connectToDatabase();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle successful checkout session completion
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata || {};
    const clerkId = metadata.clerkId;

    if (!clerkId) {
      console.error('Missing clerkId in checkout session metadata');
      return;
    }

    const patient = await Patient.findOne({ clerkId });
    if (!patient) {
      console.error(`Patient not found for clerkId: ${clerkId}`);
      return;
    }

    // Check if already processed
    const existingTransaction = await Transaction.findOne({
      stripeSessionId: session.id,
    });

    if (existingTransaction) {
      console.log(`Checkout session ${session.id} already processed`);
      return;
    }

    console.log(`Processing checkout session completion for patient: ${patient._id}`);
    
    // This will be handled by the checkout-success endpoint
    // Webhook serves as a backup and for subscription renewals
    
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Handle successful subscription invoice payment (renewals)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      console.log('Invoice not associated with subscription, skipping');
      return;
    }

    const patient = await Patient.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (!patient) {
      console.error(`Patient not found for subscription: ${invoice.subscription}`);
      return;
    }

    // Check if this is a renewal (not the first payment)
    const existingTransactions = await Transaction.find({
      patientId: patient._id,
      type: TransactionType.SUBSCRIPTION,
      stripeSubscriptionId: invoice.subscription,
    });

    if (existingTransactions.length === 0) {
      console.log('First subscription payment, handled by checkout session');
      return;
    }

    // This is a subscription renewal
    const subscriptionPlan = patient.subscriptionPlan;
    if (!subscriptionPlan || !SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]) {
      console.error(`Invalid subscription plan: ${subscriptionPlan}`);
      return;
    }

    const plan = SUBSCRIPTION_PLANS[subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS];
    
    // Add credits for renewal
    patient.creditBalance += plan.credits;
    
    // Update subscription dates
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    patient.subscriptionEndDate = endDate;
    patient.subscriptionStatus = 'active';
    
    await patient.save();

    // Create transaction record for renewal
    const transaction = new Transaction({
      userId: patient.userId,
      clerkId: patient.clerkId,
      patientId: patient._id,
      type: TransactionType.SUBSCRIPTION,
      status: TransactionStatus.COMPLETED,
      credits: plan.credits,
      amount: (invoice.amount_paid || 0) / 100,
      description: `${plan.name} subscription renewal`,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription as string,
      metadata: {
        planKey: subscriptionPlan,
        renewal: true,
      },
    });

    await transaction.save();

    // Send renewal confirmation email
    try {
      const user = await fetch(`https://api.clerk.dev/v1/users/${patient.clerkId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

      const email = user.email_addresses?.[0]?.email_address;
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();

      if (email) {
        await sendEmail({
          template: EmailTemplate.SUBSCRIPTION_RENEWAL,
          to: email,
          data: {
            patientName: name,
            planName: plan.name,
            creditsAdded: plan.credits,
            newBalance: patient.creditBalance,
            amount: (invoice.amount_paid || 0) / 100,
            renewalDate: patient.subscriptionEndDate?.toISOString().split('T')[0] || '',
          },
        });
      }
    } catch (emailError) {
      console.error('Failed to send renewal email:', emailError);
    }

    console.log(`Subscription renewed for patient: ${patient._id}, added ${plan.credits} credits`);

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

// Handle failed subscription payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      return;
    }

    const patient = await Patient.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (!patient) {
      console.error(`Patient not found for subscription: ${invoice.subscription}`);
      return;
    }

    // Update subscription status
    patient.subscriptionStatus = 'past_due';
    await patient.save();

    // Send payment failed email
    try {
      const user = await fetch(`https://api.clerk.dev/v1/users/${patient.clerkId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then(res => res.json());

      const email = user.email_addresses?.[0]?.email_address;
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();

      if (email) {
        await sendEmail({
          template: EmailTemplate.PAYMENT_FAILED,
          to: email,
          data: {
            patientName: name,
            amount: (invoice.amount_due || 0) / 100,
            dueDate: new Date(invoice.due_date! * 1000).toISOString().split('T')[0],
          },
        });
      }
    } catch (emailError) {
      console.error('Failed to send payment failed email:', emailError);
    }

    console.log(`Payment failed for patient: ${patient._id}`);

  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const patient = await Patient.findOne({
      stripeSubscriptionId: subscription.id,
    });

    if (!patient) {
      console.error(`Patient not found for subscription: ${subscription.id}`);
      return;
    }

    // Update subscription status based on Stripe status
    let subscriptionStatus = 'active';
    if (subscription.status === 'canceled') {
      subscriptionStatus = 'canceled';
    } else if (subscription.status === 'past_due') {
      subscriptionStatus = 'past_due';
    } else if (subscription.status === 'unpaid') {
      subscriptionStatus = 'unpaid';
    }

    patient.subscriptionStatus = subscriptionStatus;
    await patient.save();

    console.log(`Subscription updated for patient: ${patient._id}, status: ${subscriptionStatus}`);

  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const patient = await Patient.findOne({
      stripeSubscriptionId: subscription.id,
    });

    if (!patient) {
      console.error(`Patient not found for subscription: ${subscription.id}`);
      return;
    }

    // Update subscription status
    patient.subscriptionStatus = 'canceled';
    patient.subscriptionEndDate = new Date(); // End immediately
    await patient.save();

    console.log(`Subscription canceled for patient: ${patient._id}`);

  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
    // Additional processing if needed
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(`Payment intent failed: ${paymentIntent.id}`);
    // Additional processing if needed
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}
