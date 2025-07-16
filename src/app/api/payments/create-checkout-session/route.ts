import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { createSubscriptionCheckoutSession, createCreditsCheckoutSession, createOrRetrieveCustomer, SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '@/lib/stripe';
import { withPatientAuth } from '@/lib/auth/rbac';

// Create Stripe Checkout session for subscription or credits
async function createCheckoutSessionHandler(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, planKey, packageKey, successUrl, cancelUrl } = body;

    // Validate request
    if (!type || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: type, successUrl, cancelUrl' },
        { status: 400 }
      );
    }

    if (type === 'subscription' && !planKey) {
      return NextResponse.json(
        { error: 'Missing planKey for subscription' },
        { status: 400 }
      );
    }

    if (type === 'credits' && !packageKey) {
      return NextResponse.json(
        { error: 'Missing packageKey for credits' },
        { status: 400 }
      );
    }

    // Validate plan/package exists
    if (type === 'subscription' && !SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    if (type === 'credits' && !CREDIT_PACKAGES[packageKey as keyof typeof CREDIT_PACKAGES]) {
      return NextResponse.json(
        { error: 'Invalid credit package' },
        { status: 400 }
      );
    }

    // Connect to database and get patient
    await connectToDatabase();
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get user info from Clerk
    const user = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }).then(res => res.json());

    const email = user.email_addresses?.[0]?.email_address;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    const customerId = await createOrRetrieveCustomer({
      clerkId: userId,
      email,
      name,
    });

    if (!customerId) {
      return NextResponse.json(
        { error: 'Failed to create Stripe customer' },
        { status: 500 }
      );
    }

    // Update patient with Stripe customer ID if not already set
    if (!patient.stripeCustomerId) {
      patient.stripeCustomerId = customerId;
      await patient.save();
    }

    let session;
    const metadata = {
      clerkId: userId,
      patientId: patient._id.toString(),
      email,
    };

    // Create checkout session based on type
    if (type === 'subscription') {
      session = await createSubscriptionCheckoutSession({
        planKey: planKey as keyof typeof SUBSCRIPTION_PLANS,
        customerId,
        successUrl,
        cancelUrl,
        metadata,
      });
    } else if (type === 'credits') {
      session = await createCreditsCheckoutSession({
        packageKey: packageKey as keyof typeof CREDIT_PACKAGES,
        customerId,
        successUrl,
        cancelUrl,
        metadata,
      });
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      url: session.url,
      customerId,
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/payments/create-checkout-session
export const POST = withPatientAuth(createCheckoutSessionHandler);

// GET /api/payments/create-checkout-session - Get available plans and packages
export async function GET() {
  try {
    return NextResponse.json({
      subscriptionPlans: SUBSCRIPTION_PLANS,
      creditPackages: CREDIT_PACKAGES,
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
