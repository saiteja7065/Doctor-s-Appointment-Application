import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe, formatPrice } from '@/lib/stripe';
import { connectToMongoose } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction } from '@/lib/models/Transaction';

/**
 * POST /api/payments/verify
 * Verify a Stripe checkout session and return payment details
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer', 'subscription']
      });
    } catch (error) {
      console.error('Error retrieving Stripe session:', error);
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      );
    }

    // Verify the session belongs to the current user
    const customer = session.customer as any;
    if (!customer || !customer.metadata?.clerkId || customer.metadata.clerkId !== userId) {
      return NextResponse.json(
        { error: 'Session does not belong to current user' },
        { status: 403 }
      );
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: true,
          demo: true,
          message: 'Payment verified (demo mode)',
          type: session.metadata?.type || 'credits',
          amount: formatPrice(session.amount_total || 0),
          sessionId: session.id
        }
      );
    }

    // Find the patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Find the transaction record
    const transaction = await Transaction.findOne({ 
      stripeSessionId: sessionId,
      clerkId: userId 
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction record not found' },
        { status: 404 }
      );
    }

    // Prepare response data based on transaction type
    const responseData: any = {
      success: true,
      type: session.metadata?.type || 'credits',
      amount: formatPrice(session.amount_total || 0),
      transactionId: transaction._id.toString(),
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
    };

    if (session.metadata?.type === 'credit_purchase') {
      responseData.credits = parseInt(session.metadata.credits || '0');
      responseData.packageId = session.metadata.packageId;
    } else if (session.metadata?.type === 'subscription') {
      responseData.planId = session.metadata.planId;
      responseData.planName = getPlanName(session.metadata.planId);
      responseData.credits = parseInt(session.metadata.credits || '0');
      
      // Include subscription details if available
      if (session.subscription) {
        const subscription = session.subscription as any;
        responseData.subscriptionId = subscription.id;
        responseData.subscriptionStatus = subscription.status;
        responseData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        responseData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      }
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/verify?session_id=xxx
 * Alternative GET endpoint for payment verification
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
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
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Use the same logic as POST
    return POST(new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ sessionId })
    }));

  } catch (error) {
    console.error('Error in GET verify:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get plan name from plan ID
 */
function getPlanName(planId?: string): string {
  if (!planId) return 'Unknown Plan';
  
  const planNames: Record<string, string> = {
    'plan_basic': 'Basic Plan',
    'plan_premium': 'Premium Plan',
    'plan_pro': 'Professional Plan',
    'plan_unlimited': 'Unlimited Plan'
  };

  return planNames[planId] || planId.replace('plan_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Helper function to validate session metadata
 */
function validateSessionMetadata(metadata: any): boolean {
  if (!metadata || !metadata.type) {
    return false;
  }

  if (metadata.type === 'credit_purchase') {
    return !!(metadata.packageId && metadata.credits);
  }

  if (metadata.type === 'subscription') {
    return !!(metadata.planId && metadata.credits);
  }

  return false;
}

/**
 * Helper function to format transaction details for response
 */
function formatTransactionDetails(transaction: any, session: any) {
  return {
    id: transaction._id.toString(),
    type: transaction.type,
    description: transaction.description,
    credits: transaction.credits,
    amount: transaction.formattedAmount,
    status: transaction.status,
    createdAt: transaction.createdAt,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    metadata: transaction.metadata
  };
}

/**
 * Helper function to get customer information
 */
function getCustomerInfo(session: any) {
  const customer = session.customer as any;
  const customerDetails = session.customer_details;
  
  return {
    id: customer?.id,
    email: customerDetails?.email || customer?.email,
    name: customerDetails?.name || customer?.name,
    phone: customerDetails?.phone || customer?.phone
  };
}
