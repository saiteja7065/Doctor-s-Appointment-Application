'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Star, 
  Check,
  Zap,
  Crown,
  Gift,
  History,
  Plus
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'usage' | 'refund';
  description: string;
  credits: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function SubscriptionPage() {
  const { user, isLoaded } = useUser();
  const [currentCredits, setCurrentCredits] = useState(2);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free Plan',
      price: 0,
      credits: 2,
      features: [
        '2 consultation credits',
        'Basic video calls',
        'Standard support',
        'Medical records access'
      ],
      current: currentPlan === 'free'
    },
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 29,
      credits: 10,
      features: [
        '10 consultation credits',
        'HD video calls',
        'Priority support',
        'Medical records access',
        'Prescription management',
        'Health tracking'
      ]
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      price: 79,
      credits: 30,
      features: [
        '30 consultation credits',
        '4K video calls',
        '24/7 priority support',
        'Advanced medical records',
        'Prescription management',
        'Health tracking & analytics',
        'Specialist referrals',
        'Family account sharing'
      ],
      popular: true
    },
    {
      id: 'unlimited',
      name: 'Unlimited Plan',
      price: 149,
      credits: 999,
      features: [
        'Unlimited consultations',
        '4K video calls',
        'Dedicated support manager',
        'Advanced medical records',
        'Prescription management',
        'Health tracking & analytics',
        'Specialist referrals',
        'Family account sharing',
        'Annual health checkup'
      ]
    }
  ];

  useEffect(() => {
    const loadSubscriptionData = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/patients/subscription');

        if (response.ok) {
          const data = await response.json();
          setCurrentCredits(data.creditBalance);
          setCurrentPlan(data.subscriptionPlan);
          setTransactions(data.transactions);
        } else {
          // Fallback to demo data if API fails
          const mockTransactions: Transaction[] = [
            {
              id: '1',
              type: 'usage',
              description: 'Video consultation with Dr. Sarah Johnson',
              credits: -2,
              date: '2024-01-10',
              status: 'completed'
            },
            {
              id: '2',
              type: 'purchase',
              description: 'Welcome bonus credits',
              credits: 2,
              date: '2024-01-01',
              status: 'completed'
            }
          ];

          setTransactions(mockTransactions);
        }
      } catch (error) {
        console.error('Error loading subscription data:', error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      loadSubscriptionData();
    }
  }, [isLoaded, user]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <Plus className="h-4 w-4 text-green-600" />;
      case 'usage': return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'refund': return <Gift className="h-4 w-4 text-purple-600" />;
      case 'bonus': return <Gift className="h-4 w-4 text-purple-600" />;
      default: return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const handlePurchaseCredits = async (credits: number) => {
    try {
      const response = await fetch('/api/patients/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'purchase_credits',
          credits,
          paymentMethod: 'demo' // In real implementation, this would be from Stripe
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentCredits(data.newBalance);
        // Refresh transaction history
        const subscriptionResponse = await fetch('/api/patients/subscription');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setTransactions(subscriptionData.transactions);
        }
        alert(`Successfully purchased ${credits} credits!`);
      } else {
        throw new Error(data.error || 'Failed to purchase credits');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      alert('Failed to purchase credits. Please try again.');
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    try {
      const response = await fetch('/api/patients/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'upgrade_plan',
          planId,
          paymentMethod: 'demo' // In real implementation, this would be from Stripe
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentPlan(data.newPlan);
        setCurrentCredits(data.newBalance);
        // Refresh transaction history
        const subscriptionResponse = await fetch('/api/patients/subscription');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setTransactions(subscriptionData.transactions);
        }
        alert(`Successfully upgraded to ${planId} plan!`);
      } else {
        throw new Error(data.error || 'Failed to upgrade plan');
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('Failed to upgrade plan. Please try again.');
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
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
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription & Credits</h1>
          <p className="text-muted-foreground mt-2">
            Manage your consultation credits and subscription plan
          </p>
        </div>
      </motion.div>

      {/* Current Credits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <span>Available Credits</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary">{currentCredits}</div>
                <p className="text-sm text-muted-foreground">
                  {currentCredits >= 2 ? 'Ready for consultations' : 'Need more credits'}
                </p>
              </div>
              <Badge variant={currentCredits >= 2 ? 'default' : 'destructive'}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Credit Purchase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Quick Credit Purchase</span>
            </CardTitle>
            <CardDescription>
              Need more credits? Purchase them instantly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[5, 10, 20, 50].map((credits) => (
                <Button
                  key={credits}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => handlePurchaseCredits(credits)}
                >
                  <div className="text-2xl font-bold text-primary">{credits}</div>
                  <div className="text-xs text-muted-foreground">credits</div>
                  <div className="text-sm font-medium">${(credits * 2.5).toFixed(0)}</div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-foreground">Choose Your Plan</h2>
          <p className="text-muted-foreground">
            Upgrade your plan to get more consultation credits and premium features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`glass-card relative h-full ${
                plan.popular ? 'ring-2 ring-primary' : ''
              } ${plan.current ? 'bg-primary/5' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center space-x-2">
                    {plan.id === 'unlimited' && <Crown className="h-5 w-5 text-yellow-500" />}
                    <span>{plan.name}</span>
                  </CardTitle>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      ${plan.price}
                      {plan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {plan.credits === 999 ? 'Unlimited' : plan.credits} credits
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center space-x-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full"
                    variant={plan.current ? 'outline' : 'default'}
                    disabled={plan.current}
                    onClick={() => plan.id !== 'free' && !plan.current && handleUpgradePlan(plan.id)}
                  >
                    {plan.current ? 'Current Plan' : plan.id === 'free' ? 'Free Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription>
              Your recent credit transactions and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No transactions yet
                </h3>
                <p className="text-muted-foreground">
                  Your credit transactions will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <div className="font-medium text-foreground">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        transaction.credits > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.credits > 0 ? '+' : ''}{transaction.credits} credits
                      </div>
                      <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
