'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  CreditCard, 
  Calendar, 
  Package,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { processPaymentSuccess } from '@/lib/stripe-client';
import { toast } from 'sonner';
import Link from 'next/link';

interface PaymentResult {
  transaction: {
    id: string;
    type: string;
    credits: number;
    amount: number;
    description: string;
  };
  patient: {
    creditBalance: number;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionEndDate?: string;
  };
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const isDemo = searchParams.get('demo') === 'true';

  useEffect(() => {
    if (!sessionId) {
      setError('Missing payment session information');
      setLoading(false);
      return;
    }

    processPayment();
  }, [sessionId]);

  const processPayment = async () => {
    try {
      if (isDemo) {
        // Demo mode - simulate successful payment
        setPaymentResult({
          transaction: {
            id: 'demo_transaction_id',
            type: 'subscription',
            credits: 10,
            amount: 19.99,
            description: 'Basic Plan subscription purchase (Demo)',
          },
          patient: {
            creditBalance: 12, // 2 existing + 10 new
            subscriptionPlan: 'basic',
            subscriptionStatus: 'active',
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });
        toast.success('Demo payment processed successfully!');
        setLoading(false);
        return;
      }

      const result = await processPaymentSuccess(sessionId!);
      
      if (result.success) {
        setPaymentResult(result.data);
        toast.success('Payment processed successfully!');
      } else {
        setError(result.error || 'Failed to process payment');
        toast.error(result.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
              <p className="text-gray-600 text-center">
                Please wait while we confirm your payment and update your account...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Payment Error</h2>
              <p className="text-gray-600 text-center mb-6">{error}</p>
              <div className="flex space-x-4">
                <Button variant="outline" onClick={() => router.back()}>
                  Go Back
                </Button>
                <Button asChild>
                  <Link href="/dashboard/patient/billing">
                    Try Again
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentResult) {
    return null;
  }

  const { transaction, patient } = paymentResult;
  const isSubscription = transaction.type === 'subscription';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Success Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 text-center">
              {isDemo && (
                <Badge variant="secondary" className="mb-2">Demo Mode</Badge>
              )}
              <br />
              Your payment has been processed and your account has been updated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Transaction ID:</span>
            <span className="font-mono text-sm">{transaction.id}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Description:</span>
            <span className="font-medium">{transaction.description}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount Paid:</span>
            <span className="font-bold text-lg">
              ${transaction.amount.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Credits Added:</span>
            <span className="font-bold text-primary text-lg">
              +{transaction.credits} Credits
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Current Credit Balance:</span>
            <span className="font-bold text-2xl text-primary">
              {patient.creditBalance} Credits
            </span>
          </div>
          
          {isSubscription && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subscription Plan:</span>
                <Badge variant="default" className="capitalize">
                  {patient.subscriptionPlan} Plan
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                <Badge 
                  variant={patient.subscriptionStatus === 'active' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {patient.subscriptionStatus}
                </Badge>
              </div>
              
              {patient.subscriptionEndDate && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Next Billing Date:</span>
                  <span className="font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(patient.subscriptionEndDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Alert className="mb-6">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Your credits are now available for booking consultations. You can start scheduling appointments with doctors immediately.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild className="flex-1">
          <Link href="/dashboard/patient/doctors">
            <ArrowRight className="w-4 h-4 mr-2" />
            Book Consultation
          </Link>
        </Button>
        
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard/patient">
            Go to Dashboard
          </Link>
        </Button>
        
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard/patient/billing">
            View Billing
          </Link>
        </Button>
      </div>

      {isDemo && (
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This was a demo transaction. No actual payment was processed. In production, this would be a real Stripe payment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
