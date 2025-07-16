'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Package, 
  Star, 
  Check, 
  Zap, 
  Shield, 
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { redirectToCheckout, getPaymentOptions, formatPrice } from '@/lib/stripe-client';
import { toast } from 'sonner';

interface PatientData {
  creditBalance: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionEndDate?: string;
}

interface PaymentOptions {
  subscriptionPlans: any;
  creditPackages: any;
}

export default function BillingPage() {
  const { user } = useUser();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientData();
    fetchPaymentOptions();
  }, []);

  const fetchPatientData = async () => {
    try {
      const response = await fetch('/api/patients/profile');
      if (response.ok) {
        const data = await response.json();
        setPatientData(data.patient);
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentOptions = async () => {
    try {
      const options = await getPaymentOptions();
      setPaymentOptions(options);
    } catch (error) {
      console.error('Failed to fetch payment options:', error);
    }
  };

  const handleSubscriptionPurchase = async (planKey: string) => {
    setProcessingPayment(`subscription-${planKey}`);
    
    try {
      const result = await redirectToCheckout({
        type: 'subscription',
        planKey,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Subscription purchase error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleCreditsPurchase = async (packageKey: string) => {
    setProcessingPayment(`credits-${packageKey}`);
    
    try {
      const result = await redirectToCheckout({
        type: 'credits',
        packageKey,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Credits purchase error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const subscriptionPlans = paymentOptions?.subscriptionPlans || {};
  const creditPackages = paymentOptions?.creditPackages || {};

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscriptions</h1>
        <p className="text-gray-600">Manage your subscription and purchase consultation credits</p>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Credit Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {patientData?.creditBalance || 0} Credits
            </div>
            <p className="text-sm text-gray-500 mt-1">Available for consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {patientData?.subscriptionPlan || 'Free'} Plan
            </div>
            <Badge 
              variant={patientData?.subscriptionStatus === 'active' ? 'default' : 'secondary'}
              className="mt-1"
            >
              {patientData?.subscriptionStatus || 'inactive'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Next Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patientData?.subscriptionEndDate 
                ? new Date(patientData.subscriptionEndDate).toLocaleDateString()
                : 'N/A'
              }
            </div>
            <p className="text-sm text-gray-500 mt-1">Renewal date</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
          <TabsTrigger value="credits">Buy Credits</TabsTrigger>
        </TabsList>

        {/* Subscription Plans */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(subscriptionPlans).map(([key, plan]: [string, any]) => (
              <Card
                key={key}
                className={`relative ${key === 'premium' ? 'border-primary shadow-lg' : ''}`}
              >
                {key === 'premium' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
                    {plan.price > 0 && <span className="text-sm text-gray-500">/month</span>}
                  </div>
                  <CardDescription>{plan.credits} consultation credits</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features?.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    )) || []}
                  </ul>

                  <Separator />

                  <Button
                    className="w-full"
                    variant={key === 'premium' ? 'default' : 'outline'}
                    disabled={
                      key === 'free' ||
                      patientData?.subscriptionPlan === key ||
                      processingPayment === `subscription-${key}`
                    }
                    onClick={() => handleSubscriptionPurchase(key)}
                  >
                    {processingPayment === `subscription-${key}` ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : key === 'free' ? (
                      'Current Plan'
                    ) : patientData?.subscriptionPlan === key ? (
                      'Current Plan'
                    ) : (
                      'Choose Plan'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Subscription plans automatically renew monthly and include the specified number of consultation credits.
              Unused credits roll over to the next billing period.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Credit Packages */}
        <TabsContent value="credits" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(creditPackages).map(([key, creditPackage]: [string, any]) => (
              <Card key={key} className="relative">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{creditPackage.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(creditPackage.price)}
                  </div>
                  <CardDescription>
                    {formatPrice(creditPackage.price / creditPackage.credits)} per credit
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {creditPackage.credits} Credits
                    </div>
                    <p className="text-sm text-gray-500">One-time purchase</p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <Zap className="w-4 h-4" />
                    <span>Instant delivery</span>
                  </div>
                  
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={processingPayment === `credits-${key}`}
                    onClick={() => handleCreditsPurchase(key)}
                  >
                    {processingPayment === `credits-${key}` ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Buy Credits
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              Credit packages are one-time purchases that never expire. Credits are automatically added to your account after successful payment.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-green-500" />
            <div>
              <h3 className="font-semibold">Secure Payments</h3>
              <p className="text-sm text-gray-600">
                All payments are processed securely through Stripe. We never store your payment information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
