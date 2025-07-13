import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe, getOrCreateCustomer } from '@/lib/stripe';

/**
 * POST /api/payments/setup-intent
 * Create a Stripe setup intent for adding payment methods
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      return NextResponse.json(
        { error: 'Return URL is required' },
        { status: 400 }
      );
    }

    // Get user details from Clerk
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userId, email, name);

    // Create setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        clerkId: userId,
      },
    });

    // Create checkout session for setup
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${returnUrl}?setup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?setup=cancelled`,
      setup_intent_data: {
        metadata: {
          clerkId: userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      setupIntentId: setupIntent.id,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}
