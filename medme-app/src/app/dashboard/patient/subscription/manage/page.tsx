'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Crown,
  Star,
  Check,
  X,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertCircle,
  Gift,
  Zap,
  Shield,
  Users,
  Clock,
  RefreshCw
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
  savings?: string;
}

interface SubscriptionData {
  currentPlan: string;
  status: string;
  nextBillingDate?: string;
  creditsUsed: number;
  creditsRemaining: number;
  totalCredits: number;
  billingCycle: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

interface UsageAnalytics {
  monthlyUsage: { month: string; credits: number }[];
  averageMonthlyUsage: number;
  peakUsageMonth: string;
  recommendedPlan: string;
}

export default function SubscriptionManagePage() {
  const { user, isLoaded } = useUser();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free Plan',
      credits: 2,
      price: 0,
      interval: 'month',
      description: 'Perfect for trying out our service',
      features: [
        '2 consultation credits',
        'Basic video calls',
        'Standard support',
        'Basic appointment scheduling'
      ],
      current: false
    },
    {
      id: 'basic',
      name: 'Basic Plan',
      credits: 10,
      price: 15,
      interval: 'month',
      description: 'Great for occasional consultations',
      features: [
        '10 consultation credits per month',
        'HD video calls',
        'Email support',
        'Advanced appointment scheduling',
        'Appointment reminders'
      ],
      popular: false,
      current: false
    },
    {
      id: 'standard',
      name: 'Standard Plan',
      credits: 25,
      price: 35,
      interval: 'month',
      description: 'Perfect for regular healthcare needs',
      features: [
        '25 consultation credits per month',
        'HD video calls',
        'Priority email support',
        'Advanced appointment scheduling',
        'Appointment reminders',
        'Health record storage'
      ],
      popular: true,
      current: false
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      credits: 50,
      price: 60,
      interval: 'month',
      description: 'Best value for frequent consultations',
      features: [
        '50 consultation credits per month',
        'HD video calls',
        '24/7 priority support',
        'Advanced appointment scheduling',
        'Appointment reminders',
        'Health record storage',
        'Family account sharing',
        'Dedicated account manager'
      ],
      current: false
    }
  ];

  const loadSubscriptionData = async () => {
    try {
      const response = await fetch('/api/patients/subscription/manage');
      const data = await response.json();

      if (response.ok) {
        setSubscriptionData(data.subscription);
        setUsageAnalytics(data.analytics);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load subscription data');
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError('Failed to load subscription information');
      // Set demo data for development
      setSubscriptionData({
        currentPlan: 'standard',
        status: 'active',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        creditsUsed: 15,
        creditsRemaining: 10,
        totalCredits: 25,
        billingCycle: 'monthly',
        autoRenew: true,
        cancelAtPeriodEnd: false
      });
      setUsageAnalytics({
        monthlyUsage: [
          { month: 'Jan', credits: 18 },
          { month: 'Feb', credits: 22 },
          { month: 'Mar', credits: 15 },
          { month: 'Apr', credits: 25 },
          { month: 'May', credits: 20 },
          { month: 'Jun', credits: 15 }
        ],
        averageMonthlyUsage: 19.2,
        peakUsageMonth: 'April',
        recommendedPlan: 'standard'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadSubscriptionData();
    }
  }, [isLoaded, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSubscriptionData();
    setIsRefreshing(false);
  };

  const handlePlanChange = async (planId: string) => {
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'subscription',
          planId: planId === 'free' ? 'free' : `plan_${planId}`,
          successUrl: `${window.location.origin}/dashboard/patient/subscription/success`,
          cancelUrl: `${window.location.origin}/dashboard/patient/subscription/manage`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Failed to change subscription plan. Please try again.');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      return;
    }

    try {
      const response = await fetch('/api/payments/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel_subscription'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Subscription cancelled successfully. You will retain access until the end of your current billing period.');
        await loadSubscriptionData();
      } else {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  const getUsagePercentage = () => {
    if (!subscriptionData) return 0;
    return (subscriptionData.creditsUsed / subscriptionData.totalCredits) * 100;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Gift className="h-5 w-5" />;
      case 'basic':
        return <Zap className="h-5 w-5" />;
      case 'standard':
        return <Star className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      cancelled: 'destructive',
      expired: 'secondary',
      pending: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription plan, usage, and billing preferences
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Current Subscription Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getPlanIcon(subscriptionData?.currentPlan || 'free')}
              <span>Current Plan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold capitalize">
                  {subscriptionData?.currentPlan || 'Free'} Plan
                </h3>
                <p className="text-muted-foreground">
                  {subscriptionData?.billingCycle || 'No billing cycle'}
                </p>
              </div>
              {getStatusBadge(subscriptionData?.status || 'inactive')}
            </div>
            
            {subscriptionData?.nextBillingDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Next billing: {new Date(subscriptionData.nextBillingDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {subscriptionData?.cancelAtPeriodEnd && (
              <div className="flex items-center space-x-2 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Subscription will cancel at the end of the current period
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Usage</CardTitle>
            <CardDescription>
              Your consultation credit usage this billing period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Credits Used</span>
                <span>{subscriptionData?.creditsUsed || 0} / {subscriptionData?.totalCredits || 0}</span>
              </div>
              <Progress value={getUsagePercentage()} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {subscriptionData?.creditsRemaining || 0}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {subscriptionData?.creditsUsed || 0}
                </div>
                <div className="text-xs text-muted-foreground">Used</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Management Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plans">Change Plan</TabsTrigger>
            <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
            <TabsTrigger value="billing">Billing Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>
                  Choose the plan that best fits your healthcare needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {subscriptionPlans.map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className={`relative h-full ${
                        plan.popular ? 'ring-2 ring-primary' : ''
                      } ${plan.id === subscriptionData?.currentPlan ? 'bg-primary/5' : ''}`}>
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground">
                              <Star className="h-3 w-3 mr-1" />
                              Most Popular
                            </Badge>
                          </div>
                        )}
                        
                        <CardHeader className="text-center">
                          <div className="flex justify-center mb-2">
                            {getPlanIcon(plan.id)}
                          </div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <div className="text-3xl font-bold">
                            ${plan.price}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{plan.interval}
                            </span>
                          </div>
                          <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{plan.credits}</div>
                            <div className="text-sm text-muted-foreground">credits per month</div>
                          </div>
                          
                          <ul className="space-y-2">
                            {plan.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center space-x-2 text-sm">
                                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <Button
                            className="w-full"
                            variant={plan.id === subscriptionData?.currentPlan ? "secondary" : "default"}
                            disabled={plan.id === subscriptionData?.currentPlan}
                            onClick={() => handlePlanChange(plan.id)}
                          >
                            {plan.id === subscriptionData?.currentPlan ? 'Current Plan' : 'Select Plan'}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Trends</CardTitle>
                  <CardDescription>
                    Your consultation credit usage over the past 6 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usageAnalytics?.monthlyUsage.map((month) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{month.month}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${(month.credits / 30) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8">
                            {month.credits}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Insights</CardTitle>
                  <CardDescription>
                    Personalized recommendations based on your usage patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Average Monthly Usage</p>
                      <p className="text-sm text-muted-foreground">
                        {usageAnalytics?.averageMonthlyUsage} credits per month
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Peak Usage Month</p>
                      <p className="text-sm text-muted-foreground">
                        {usageAnalytics?.peakUsageMonth}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Recommended Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {usageAnalytics?.recommendedPlan} Plan
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing Settings</CardTitle>
                <CardDescription>
                  Manage your subscription billing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-Renewal</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically renew your subscription each billing period
                    </p>
                  </div>
                  <Badge variant={subscriptionData?.autoRenew ? "default" : "secondary"}>
                    {subscriptionData?.autoRenew ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Billing Cycle</h4>
                    <p className="text-sm text-muted-foreground">
                      {subscriptionData?.billingCycle || 'No active subscription'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change Cycle
                  </Button>
                </div>

                {subscriptionData?.status === 'active' && !subscriptionData?.cancelAtPeriodEnd && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={handleCancelSubscription}
                      className="w-full"
                    >
                      Cancel Subscription
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      You will retain access until the end of your current billing period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
