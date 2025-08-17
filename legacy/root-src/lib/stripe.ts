import Stripe from 'stripe';

// Initialize Stripe with API key
const getStripeClient = (): Stripe | null => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey || apiKey === 'sk_test_demo_key_for_development') {
    console.warn('Stripe API key not configured or using demo key. Payment functionality will be disabled.');
    return null;
  }
  
  try {
    return new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  } catch (error) {
    console.error('Failed to initialize Stripe client:', error);
    return null;
  }
};

// Stripe client instance
export const stripe = getStripeClient();

// Subscription plan configurations
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    credits: 2,
    price: 0,
    priceId: null, // No Stripe price for free plan
    features: ['2 free consultations', 'Basic support', 'Standard booking'],
  },
  basic: {
    name: 'Basic Plan',
    credits: 10,
    price: 1999, // $19.99 in cents
    priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic_demo',
    features: ['10 consultations', 'Priority support', 'Advanced booking', 'Email reminders'],
  },
  premium: {
    name: 'Premium Plan',
    credits: 30,
    price: 4999, // $49.99 in cents
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_demo',
    features: ['30 consultations', '24/7 support', 'Priority booking', 'SMS reminders', 'Health reports'],
  },
  unlimited: {
    name: 'Unlimited Plan',
    credits: 999,
    price: 9999, // $99.99 in cents
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID || 'price_unlimited_demo',
    features: ['Unlimited consultations', 'Dedicated support', 'Instant booking', 'All features'],
  },
} as const;

// Credit packages for one-time purchases
export const CREDIT_PACKAGES = {
  small: {
    name: '5 Credits',
    credits: 5,
    price: 999, // $9.99 in cents
    priceId: process.env.STRIPE_CREDITS_5_PRICE_ID || 'price_credits_5_demo',
  },
  medium: {
    name: '10 Credits',
    credits: 10,
    price: 1999, // $19.99 in cents
    priceId: process.env.STRIPE_CREDITS_10_PRICE_ID || 'price_credits_10_demo',
  },
  large: {
    name: '20 Credits',
    credits: 20,
    price: 3999, // $39.99 in cents
    priceId: process.env.STRIPE_CREDITS_20_PRICE_ID || 'price_credits_20_demo',
  },
  xlarge: {
    name: '50 Credits',
    credits: 50,
    price: 9999, // $99.99 in cents
    priceId: process.env.STRIPE_CREDITS_50_PRICE_ID || 'price_credits_50_demo',
  },
} as const;

// Create Stripe Checkout session for subscription
export async function createSubscriptionCheckoutSession({
  planKey,
  customerId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  planKey: keyof typeof SUBSCRIPTION_PLANS;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ sessionId: string; url: string } | null> {
  if (!stripe) {
    console.warn('Stripe not configured. Using demo mode.');
    return {
      sessionId: 'cs_demo_session_id',
      url: successUrl + '?session_id=cs_demo_session_id&demo=true',
    };
  }

  const plan = SUBSCRIPTION_PLANS[planKey];
  if (!plan.priceId || planKey === 'free') {
    throw new Error(`Cannot create checkout session for ${planKey} plan`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        planKey,
        credits: plan.credits.toString(),
        ...metadata,
      },
      subscription_data: {
        metadata: {
          planKey,
          credits: plan.credits.toString(),
          ...metadata,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  } catch (error) {
    console.error('Failed to create subscription checkout session:', error);
    return null;
  }
}

// Create Stripe Checkout session for one-time credit purchase
export async function createCreditsCheckoutSession({
  packageKey,
  customerId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  packageKey: keyof typeof CREDIT_PACKAGES;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ sessionId: string; url: string } | null> {
  if (!stripe) {
    console.warn('Stripe not configured. Using demo mode.');
    return {
      sessionId: 'cs_demo_credits_session_id',
      url: successUrl + '?session_id=cs_demo_credits_session_id&demo=true',
    };
  }

  const creditPackage = CREDIT_PACKAGES[packageKey];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: creditPackage.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        type: 'credits',
        packageKey,
        credits: creditPackage.credits.toString(),
        ...metadata,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  } catch (error) {
    console.error('Failed to create credits checkout session:', error);
    return null;
  }
}

// Create or retrieve Stripe customer
export async function createOrRetrieveCustomer({
  clerkId,
  email,
  name,
}: {
  clerkId: string;
  email: string;
  name: string;
}): Promise<string | null> {
  if (!stripe) {
    console.warn('Stripe not configured. Using demo customer ID.');
    return `cus_demo_${clerkId}`;
  }

  try {
    // First, try to find existing customer by metadata
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        clerkId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error('Failed to create or retrieve Stripe customer:', error);
    return null;
  }
}

// Retrieve checkout session
export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.warn('Stripe not configured. Using demo session data.');
    return {
      id: sessionId,
      payment_status: 'paid',
      customer: 'cus_demo_customer',
      metadata: {
        planKey: 'basic',
        credits: '10',
      },
    } as Stripe.Checkout.Session;
  }

  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });
  } catch (error) {
    console.error('Failed to retrieve checkout session:', error);
    return null;
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    console.warn('Stripe not configured. Using demo mode.');
    return true;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return false;
  }
}

// Format price for display
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceInCents / 100);
}

// Webhook signature verification
export function verifyWebhookSignature(payload: string, signature: string): Stripe.Event | null {
  if (!stripe) {
    console.warn('Stripe not configured. Webhook verification skipped.');
    return null;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

export default stripe;
