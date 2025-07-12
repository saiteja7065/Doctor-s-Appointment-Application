import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { constructWebhookEvent, getCreditPackage, getSubscriptionPlan, formatPrice } from '@/lib/stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import {
  sendPaymentConfirmation,
  sendSubscriptionActivated,
  sendLowCreditWarning,
  sendPaymentFailedNotification
} from '@/lib/email';
import { sendNotification } from '@/lib/notifications';
import Stripe from 'stripe';

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log('Processing webhook event:', event.type);

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      console.error('Database connection failed');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Handle the event
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

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata;
    const customerId = session.customer as string;

    if (!metadata || !customerId) {
      console.error('Missing metadata or customer ID in checkout session');
      return;
    }

    // Get customer details from Stripe
    const stripe = (await import('@/lib/stripe')).default;
    const customer = await stripe.customers.retrieve(customerId);

    if (!customer || customer.deleted) {
      console.error('Customer not found or deleted');
      return;
    }

    const clerkId = (customer as Stripe.Customer).metadata.clerkId;
    if (!clerkId) {
      console.error('Missing clerkId in customer metadata');
      return;
    }

    // Find patient by clerkId
    const patient = await Patient.findOne({ clerkId });

    if (!patient) {
      console.error('Patient not found for checkout session:', session.id);
      return;
    }

    // Update patient with Stripe customer ID if not already set
    if (!patient.stripeCustomerId) {
      patient.stripeCustomerId = customerId;
    }

    if (metadata.type === 'credit_purchase') {
      // Handle credit purchase
      const packageId = metadata.packageId;
      const credits = parseInt(metadata.credits);

      if (packageId && credits) {
        patient.creditBalance += credits;
        await patient.save();

        console.log(`Added ${credits} credits to patient ${patient.clerkId}`);

        // Send payment confirmation email
        try {
          await sendPaymentConfirmation({
            customerEmail: patient.personalInfo.email,
            customerName: patient.personalInfo.fullName,
            amount: formatPrice(session.amount_total || 0),
            transactionId: session.id,
            date: new Date().toLocaleDateString(),
            paymentMethod: 'Credit Card',
            type: 'credits',
            credits: credits,
          });
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }

        // Send in-app notification
        try {
          sendNotification(
            patient.clerkId,
            'patient',
            'paymentSuccessful',
            formatPrice(session.amount_total || 0),
            credits
          );
        } catch (notificationError) {
          console.error('Failed to send payment notification:', notificationError);
        }
      }
    } else if (metadata.type === 'subscription') {
      // Handle subscription creation
      const planId = metadata.planId;
      const credits = parseInt(metadata.credits);

      if (planId && credits) {
        const plan = getSubscriptionPlan(planId);
        if (plan) {
          patient.subscriptionPlan = planId.replace('plan_', '');
          patient.subscriptionStatus = 'active';
          patient.subscriptionStartDate = new Date();
          patient.creditBalance += credits;

          // Set subscription end date (1 month from now)
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          patient.subscriptionEndDate = endDate;

          await patient.save();

          console.log(`Activated ${planId} subscription for patient ${patient.clerkId}`);

          // Send subscription activation email
          try {
            await sendSubscriptionActivated({
              customerEmail: patient.personalInfo.email,
              customerName: patient.personalInfo.fullName,
              planName: plan.name,
              credits: plan.credits,
              nextBillingDate: endDate.toLocaleDateString(),
              amount: formatPrice(plan.price),
              features: plan.features,
            });
          } catch (emailError) {
            console.error('Failed to send subscription activation email:', emailError);
          }

          // Send in-app notification
          try {
            sendNotification(
              patient.clerkId,
              'patient',
              'subscriptionActivated',
              plan.name,
              plan.credits
            );
          } catch (notificationError) {
            console.error('Failed to send subscription notification:', notificationError);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

/**
 * Handle successful invoice payment (recurring subscription)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      return; // Not a subscription invoice
    }

    const stripe = (await import('@/lib/stripe')).default;
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    
    if (!subscription.metadata.planId) {
      console.error('Missing planId in subscription metadata');
      return;
    }

    const planId = subscription.metadata.planId;
    const credits = parseInt(subscription.metadata.credits);
    
    // Find patient by Stripe customer ID
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer || customer.deleted) {
      console.error('Customer not found or deleted');
      return;
    }

    const clerkId = (customer as Stripe.Customer).metadata.clerkId;
    const patient = await Patient.findOne({ clerkId });

    if (!patient) {
      console.error('Patient not found for subscription renewal');
      return;
    }

    // Add monthly credits
    patient.creditBalance += credits;

    // Extend subscription end date
    const endDate = new Date(patient.subscriptionEndDate || new Date());
    endDate.setMonth(endDate.getMonth() + 1);
    patient.subscriptionEndDate = endDate;

    await patient.save();

    console.log(`Renewed subscription and added ${credits} credits for patient ${patient.clerkId}`);

    // Send subscription renewal notification email
    try {
      const plan = getSubscriptionPlan(planId);
      if (plan) {
        await sendPaymentConfirmation({
          customerEmail: patient.personalInfo.email,
          customerName: patient.personalInfo.fullName,
          amount: formatPrice(invoice.amount_paid || 0),
          transactionId: invoice.id,
          date: new Date().toLocaleDateString(),
          paymentMethod: 'Credit Card',
          type: 'subscription',
          planName: plan.name,
        });
      }
    } catch (emailError) {
      console.error('Failed to send subscription renewal email:', emailError);
    }

    // Send in-app notification
    try {
      sendNotification(
        patient.clerkId,
        'patient',
        'subscriptionActivated',
        getSubscriptionPlan(planId)?.name || 'Subscription',
        credits
      );
    } catch (notificationError) {
      console.error('Failed to send subscription renewal notification:', notificationError);
    }

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (!invoice.subscription) {
      return; // Not a subscription invoice
    }

    const stripe = (await import('@/lib/stripe')).default;
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      console.error('Customer not found or deleted');
      return;
    }

    const clerkId = (customer as Stripe.Customer).metadata.clerkId;
    const patient = await Patient.findOne({ clerkId });

    if (!patient) {
      console.error('Patient not found for failed payment');
      return;
    }

    // Mark subscription as past due or inactive
    patient.subscriptionStatus = 'inactive';
    await patient.save();

    console.log(`Marked subscription as inactive for patient ${patient.clerkId} due to failed payment`);

    // Send payment failed notification email
    try {
      const plan = getSubscriptionPlan(subscription.metadata.planId);
      await sendPaymentFailedNotification({
        customerEmail: patient.personalInfo.email,
        customerName: patient.personalInfo.fullName,
        amount: formatPrice(invoice.amount_due || 0),
        planName: plan?.name || 'Subscription',
        failedDate: new Date().toLocaleDateString(),
        failureReason: 'Payment method declined',
      });
    } catch (emailError) {
      console.error('Failed to send payment failed email:', emailError);
    }

    // Send in-app notification
    try {
      sendNotification(
        patient.clerkId,
        'patient',
        'paymentFailed',
        formatPrice(invoice.amount_due || 0)
      );
    } catch (notificationError) {
      console.error('Failed to send payment failed notification:', notificationError);
    }

  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  // Additional logic if needed
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  // Handle plan changes, etc.
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const stripe = (await import('@/lib/stripe')).default;
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (!customer || customer.deleted) {
      console.error('Customer not found or deleted');
      return;
    }

    const clerkId = (customer as Stripe.Customer).metadata.clerkId;
    const patient = await Patient.findOne({ clerkId });

    if (!patient) {
      console.error('Patient not found for subscription cancellation');
      return;
    }

    // Cancel subscription
    patient.subscriptionStatus = 'cancelled';
    patient.subscriptionPlan = 'free';
    await patient.save();
    
    console.log(`Cancelled subscription for patient ${patient.clerkId}`);

  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}
