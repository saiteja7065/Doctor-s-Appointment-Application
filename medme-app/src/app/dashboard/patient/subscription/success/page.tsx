'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';

interface CheckoutSession {
  id: string;
  payment_status: string;
  customer_email: string;
  amount_total: number;
  currency: string;
  metadata: {
    type: string;
    packageId?: string;
    planId?: string;
    credits?: string;
  };
}

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/payments/checkout?session_id=${sessionId}`);
        const data = await response.json();

        if (response.ok) {
          setSession(data.session);
        } else {
          setError(data.error || 'Failed to retrieve session');
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to retrieve payment information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const formatPrice = (amountInCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  const getSuccessMessage = () => {
    if (!session?.metadata) return 'Payment completed successfully!';

    if (session.metadata.type === 'credit_purchase') {
      const credits = session.metadata.credits;
      return `Successfully purchased ${credits} credits!`;
    } else if (session.metadata.type === 'subscription') {
      const planName = session.metadata.planId?.replace('plan_', '').replace('_', ' ');
      return `Successfully subscribed to ${planName} plan!`;
    }

    return 'Payment completed successfully!';
  };

  const getDescription = () => {
    if (!session?.metadata) return 'Your payment has been processed.';

    if (session.metadata.type === 'credit_purchase') {
      const credits = session.metadata.credits;
      return `${credits} credits have been added to your account and are ready to use for consultations.`;
    } else if (session.metadata.type === 'subscription') {
      const credits = session.metadata.credits;
      return `Your subscription is now active and ${credits} credits have been added to your account.`;
    }

    return 'Your payment has been processed successfully.';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processing your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Payment Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => router.push('/dashboard/patient/subscription')}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            {getSuccessMessage()}
          </CardTitle>
          <CardDescription className="text-lg">
            {getDescription()}
          </CardDescription>
        </CardHeader>

        {session && (
          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount Paid</p>
                  <p className="font-medium">
                    {formatPrice(session.amount_total, session.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Status</p>
                  <Badge variant={session.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {session.payment_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{session.customer_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-xs">{session.id}</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="rounded-lg border bg-blue-50 p-4">
              <h3 className="font-semibold mb-2 text-blue-900">What's Next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {session.metadata.type === 'credit_purchase' ? (
                  <>
                    <li>• Your credits are now available in your account</li>
                    <li>• You can book consultations with any verified doctor</li>
                    <li>• Each consultation costs 2 credits</li>
                    <li>• Check your transaction history for details</li>
                  </>
                ) : (
                  <>
                    <li>• Your subscription is now active</li>
                    <li>• Monthly credits will be automatically added</li>
                    <li>• Enjoy premium features and priority support</li>
                    <li>• Manage your subscription in your account settings</li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => router.push('/dashboard/patient/doctors')}
                className="flex-1"
              >
                Find Doctors
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/dashboard/patient/subscription')}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Subscription
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
