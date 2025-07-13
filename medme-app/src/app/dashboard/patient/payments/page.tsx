'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentManagement } from '@/components/payments/PaymentManagement';
import {
  CreditCard,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  Settings
} from 'lucide-react';

interface PaymentData {
  creditBalance: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  nextBillingDate?: string;
  totalSpent: number;
  recentTransactions: Transaction[];
  paymentMethods: PaymentMethod[];
  upcomingCharges: UpcomingCharge[];
}

interface Transaction {
  id: string;
  type: 'purchase' | 'usage' | 'subscription' | 'refund';
  description: string;
  credits: number;
  amount: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  stripePaymentIntentId?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface UpcomingCharge {
  id: string;
  description: string;
  amount: string;
  date: string;
  status: 'scheduled' | 'processing';
}

export default function PaymentsPage() {
  const { user, isLoaded } = useUser();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPaymentData = async () => {
    try {
      const response = await fetch('/api/payments/management');
      const data = await response.json();

      if (response.ok) {
        setPaymentData(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load payment data');
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      setError('Failed to load payment information');
      // Set demo data for development
      setPaymentData({
        creditBalance: 2,
        subscriptionPlan: 'free',
        subscriptionStatus: 'inactive',
        totalSpent: 0,
        recentTransactions: [],
        paymentMethods: [],
        upcomingCharges: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadPaymentData();
    }
  }, [isLoaded, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPaymentData();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      active: 'default',
      inactive: 'secondary',
      cancelled: 'destructive'
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your payments, billing, and transaction history
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

      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentData?.creditBalance || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available consultation credits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(paymentData?.totalSpent || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {paymentData?.subscriptionPlan || 'Free'}
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(paymentData?.subscriptionStatus || 'inactive')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentData?.nextBillingDate 
                ? new Date(paymentData.nextBillingDate).toLocaleDateString()
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentData?.subscriptionStatus === 'active' ? 'Upcoming charge' : 'No active subscription'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Management Component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <PaymentManagement />
      </motion.div>
    </div>
  );
}
