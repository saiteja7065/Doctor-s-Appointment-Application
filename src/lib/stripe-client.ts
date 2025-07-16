import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe client-side
let stripePromise: Promise<Stripe | null>;

const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey || publishableKey === 'pk_test_demo_key_for_development') {
      console.warn('Stripe publishable key not configured or using demo key. Payment functionality will be disabled.');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(publishableKey);
    }
  }
  
  return stripePromise;
};

// Create checkout session and redirect to Stripe
export async function redirectToCheckout({
  type,
  planKey,
  packageKey,
}: {
  type: 'subscription' | 'credits';
  planKey?: string;
  packageKey?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = await getStripe();
    
    // Demo mode handling
    if (!stripe) {
      console.warn('Stripe not configured. Using demo mode.');
      
      // Simulate successful payment in demo mode
      const demoSessionId = `cs_demo_${type}_${Date.now()}`;
      const successUrl = `${window.location.origin}/dashboard/patient/billing/success?session_id=${demoSessionId}&demo=true`;
      
      // Redirect to success page with demo parameters
      window.location.href = successUrl;
      return { success: true };
    }

    // Create checkout session
    const response = await fetch('/api/payments/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        planKey,
        packageKey,
        successUrl: `${window.location.origin}/dashboard/patient/billing/success`,
        cancelUrl: `${window.location.origin}/dashboard/patient/billing`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId, url } = await response.json();

    // Redirect to Stripe Checkout
    if (url) {
      window.location.href = url;
      return { success: true };
    } else {
      // Fallback: use Stripe.js redirect
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return { success: true };
    }

  } catch (error) {
    console.error('Checkout redirect error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Get available subscription plans and credit packages
export async function getPaymentOptions(): Promise<{
  subscriptionPlans: any;
  creditPackages: any;
} | null> {
  try {
    const response = await fetch('/api/payments/create-checkout-session', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment options');
    }

    return await response.json();
  } catch (error) {
    console.error('Get payment options error:', error);
    return null;
  }
}

// Process successful payment
export async function processPaymentSuccess(sessionId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/payments/checkout-success?session_id=${sessionId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process payment');
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    console.error('Process payment success error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Format price for display
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(priceInCents / 100);
}

// Calculate savings percentage
export function calculateSavings(regularPrice: number, discountedPrice: number): number {
  if (regularPrice <= discountedPrice) return 0;
  return Math.round(((regularPrice - discountedPrice) / regularPrice) * 100);
}

export default getStripe;
