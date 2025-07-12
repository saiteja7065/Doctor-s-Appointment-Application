import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Stripe configuration
export const stripeConfig = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  currency: 'usd',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

// Credit packages for purchase
export const creditPackages = [
  {
    id: 'credits_5',
    name: '5 Credits',
    credits: 5,
    price: 1000, // $10.00 in cents
    description: 'Perfect for occasional consultations',
    popular: false,
  },
  {
    id: 'credits_10',
    name: '10 Credits',
    credits: 10,
    price: 1800, // $18.00 in cents (10% discount)
    description: 'Great value for regular users',
    popular: true,
  },
  {
    id: 'credits_20',
    name: '20 Credits',
    credits: 20,
    price: 3200, // $32.00 in cents (20% discount)
    description: 'Best value for frequent consultations',
    popular: false,
  },
  {
    id: 'credits_50',
    name: '50 Credits',
    credits: 50,
    price: 7500, // $75.00 in cents (25% discount)
    description: 'Premium package for heavy users',
    popular: false,
  },
];

// Subscription plans
export const subscriptionPlans = [
  {
    id: 'plan_basic',
    name: 'Basic Plan',
    credits: 10,
    price: 1500, // $15.00 per month
    interval: 'month' as const,
    description: 'Perfect for occasional consultations',
    features: [
      '10 credits per month',
      'Standard video quality',
      'Email support',
      'Basic appointment scheduling',
    ],
    popular: false,
  },
  {
    id: 'plan_standard',
    name: 'Standard Plan',
    credits: 25,
    price: 3500, // $35.00 per month
    interval: 'month' as const,
    description: 'Great for regular healthcare needs',
    features: [
      '25 credits per month',
      'HD video quality',
      'Priority email support',
      'Advanced appointment scheduling',
      'Appointment reminders',
    ],
    popular: true,
  },
  {
    id: 'plan_premium',
    name: 'Premium Plan',
    credits: 50,
    price: 6000, // $60.00 per month
    interval: 'month' as const,
    description: 'Best value for frequent consultations',
    features: [
      '50 credits per month',
      'HD video quality',
      '24/7 priority support',
      'Advanced appointment scheduling',
      'Appointment reminders',
      'Health record storage',
      'Family account sharing',
    ],
    popular: false,
  },
];

/**
 * Create a Stripe checkout session for credit purchase
 */
export async function createCreditCheckoutSession(
  customerId: string,
  packageId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const creditPackage = creditPackages.find(pkg => pkg.id === packageId);
  if (!creditPackage) {
    throw new Error('Invalid credit package');
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: stripeConfig.currency,
          product_data: {
            name: creditPackage.name,
            description: creditPackage.description,
            metadata: {
              type: 'credits',
              credits: creditPackage.credits.toString(),
            },
          },
          unit_amount: creditPackage.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'credit_purchase',
      packageId: packageId,
      credits: creditPackage.credits.toString(),
    },
  });

  return session;
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createSubscriptionCheckoutSession(
  customerId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const plan = subscriptionPlans.find(p => p.id === planId);
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }

  // Create or retrieve the price for this plan
  const price = await getOrCreatePrice(plan);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'subscription',
      planId: planId,
      credits: plan.credits.toString(),
    },
  });

  return session;
}

/**
 * Get or create a Stripe price for a subscription plan
 */
async function getOrCreatePrice(plan: typeof subscriptionPlans[0]): Promise<Stripe.Price> {
  // First, try to find existing price
  const prices = await stripe.prices.list({
    lookup_keys: [plan.id],
    expand: ['data.product'],
  });

  if (prices.data.length > 0) {
    return prices.data[0];
  }

  // Create product if it doesn't exist
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: {
      type: 'subscription',
      credits: plan.credits.toString(),
    },
  });

  // Create price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.price,
    currency: stripeConfig.currency,
    recurring: {
      interval: plan.interval,
    },
    lookup_key: plan.id,
    metadata: {
      planId: plan.id,
      credits: plan.credits.toString(),
    },
  });

  return price;
}

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(
  clerkId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Try to find existing customer by metadata
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    const customer = existingCustomers.data[0];
    // Update metadata if needed
    if (!customer.metadata.clerkId) {
      await stripe.customers.update(customer.id, {
        metadata: {
          clerkId: clerkId,
        },
      });
    }
    return customer;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: email,
    name: name,
    metadata: {
      clerkId: clerkId,
    },
  });

  return customer;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Update subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<Stripe.Subscription> {
  const plan = subscriptionPlans.find(p => p.id === newPlanId);
  if (!plan) {
    throw new Error('Invalid subscription plan');
  }

  const price = await getOrCreatePrice(plan);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: price.id,
      },
    ],
    metadata: {
      planId: newPlanId,
      credits: plan.credits.toString(),
    },
  });
}

/**
 * Retrieve subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    stripeConfig.webhookSecret
  );
}

/**
 * Format price for display
 */
export function formatPrice(amountInCents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

/**
 * Get credit package by ID
 */
export function getCreditPackage(packageId: string) {
  return creditPackages.find(pkg => pkg.id === packageId);
}

/**
 * Get subscription plan by ID
 */
export function getSubscriptionPlan(planId: string) {
  return subscriptionPlans.find(plan => plan.id === planId);
}

export default stripe;
