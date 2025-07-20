'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
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

interface PaymentManagementProps {
  initialData?: Partial<PaymentData>;
  showAdvancedFeatures?: boolean;
}

export default function PaymentManagement({ 
  initialData, 
  showAdvancedFeatures = true 
}: PaymentManagementProps) {
  const { user, isLoaded } = useUser();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      loadPaymentData();
    }
  }, [isLoaded, user]);

  const loadPaymentData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/payments/management');
      
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load payment data');
        
        // No demo data fallback - show error state
        setPaymentData({
          creditBalance: 0,
          subscriptionPlan: 'none',
          subscriptionStatus: 'inactive',
          totalSpent: 0,
          recentTransactions: [],
          paymentMethods: [],
          upcomingCharges: []
        });
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      setError('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPaymentData();
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
      case 'processing':
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
      case 'processing':
      case 'scheduled':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
      case 'canceled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const exportTransactions = () => {
    if (!paymentData?.recentTransactions) return;
    
    const csvContent = [
      ['Date', 'Type', 'Description', 'Credits', 'Amount', 'Status'],
      ...paymentData.recentTransactions.map(t => [
        t.date,
        t.type,
        t.description,
        t.credits.toString(),
        t.amount,
        t.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medme-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-red-700">
              Failed to Load Payment Data
            </h3>
            <p className="text-red-600">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Payment Management</h2>
          <p className="text-muted-foreground">
            Manage your subscription, credits, and payment methods
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Available Credits
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {paymentData?.creditBalance || 0}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Current Plan
                  </p>
                  <p className="text-2xl font-bold capitalize">
                    {paymentData?.subscriptionPlan || 'Free'}
                  </p>
                  <Badge className={getStatusColor(paymentData?.subscriptionStatus || 'active')}>
                    {getStatusIcon(paymentData?.subscriptionStatus || 'active')}
                    <span className="ml-1 capitalize">
                      {paymentData?.subscriptionStatus || 'Active'}
                    </span>
                  </Badge>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    ${paymentData?.totalSpent?.toFixed(2) || '0.00'}
                  </p>
                  {paymentData?.nextBillingDate && (
                    <p className="text-sm text-muted-foreground">
                      Next: {new Date(paymentData.nextBillingDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Information Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Your payment and credit transaction history
                    </CardDescription>
                  </div>
                  <Button
                    onClick={exportTransactions}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentData?.recentTransactions?.length ? (
                  <div className="space-y-4">
                    {paymentData.recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(transaction.status)}
                          <div>
                            <p className="font-medium text-foreground">
                              {transaction.description}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.date).toLocaleDateString()} • {transaction.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.credits > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.credits > 0 ? '+' : ''}{transaction.credits} credits
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.amount}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No transactions yet
                    </h3>
                    <p className="text-muted-foreground">
                      Your payment transactions will appear here
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
