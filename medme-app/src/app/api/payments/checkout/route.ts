import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  createCreditCheckoutSession, 
  createSubscriptionCheckoutSession, 
  getOrCreateCustomer,
  stripeConfig 
} from '@/lib/stripe';

/**
 * POST /api/payments/checkout
 * Create a Stripe checkout session for credit purchase or subscription
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
    const { type, packageId, planId, email, name } = body;

    if (!type || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: type, email' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['credits', 'subscription'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "credits" or "subscription"' },
        { status: 400 }
      );
    }

    // Validate required fields based on type
    if (type === 'credits' && !packageId) {
      return NextResponse.json(
        { error: 'Missing required field: packageId' },
        { status: 400 }
      );
    }

    if (type === 'subscription' && !planId) {
      return NextResponse.json(
        { error: 'Missing required field: planId' },
        { status: 400 }
      );
    }

    try {
      // Create or get Stripe customer
      const customer = await getOrCreateCustomer(userId, email, name);

      // Create checkout URLs
      const baseUrl = stripeConfig.appUrl;
      const successUrl = `${baseUrl}/dashboard/patient/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/dashboard/patient/subscription?canceled=true`;

      let session;

      if (type === 'credits') {
        // Create credit purchase session
        session = await createCreditCheckoutSession(
          customer.id,
          packageId,
          successUrl,
          cancelUrl
        );
      } else {
        // Create subscription session
        session = await createSubscriptionCheckoutSession(
          customer.id,
          planId,
          successUrl,
          cancelUrl
        );
      }

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        customerId: customer.id,
      });

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json(
          { error: 'Your card was declined.' },
          { status: 400 }
        );
      }

      if (stripeError.type === 'StripeRateLimitError') {
        return NextResponse.json(
          { error: 'Too many requests made to the API too quickly.' },
          { status: 429 }
        );
      }

      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { error: 'Invalid parameters were supplied to Stripe.' },
          { status: 400 }
        );
      }

      if (stripeError.type === 'StripeAPIError') {
        return NextResponse.json(
          { error: 'An error occurred with Stripe API.' },
          { status: 500 }
        );
      }

      if (stripeError.type === 'StripeConnectionError') {
        return NextResponse.json(
          { error: 'A network error occurred.' },
          { status: 500 }
        );
      }

      if (stripeError.type === 'StripeAuthenticationError') {
        return NextResponse.json(
          { error: 'Authentication with Stripe failed.' },
          { status: 500 }
        );
      }

      // Generic error
      return NextResponse.json(
        { error: 'Payment processing failed. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/checkout
 * Get checkout session details
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    try {
      const stripe = (await import('@/lib/stripe')).default;
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          payment_status: session.payment_status,
          customer_email: session.customer_email,
          amount_total: session.amount_total,
          currency: session.currency,
          metadata: session.metadata,
        },
      });

    } catch (stripeError: any) {
      console.error('Stripe session retrieval error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to retrieve checkout session' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Checkout session retrieval API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
