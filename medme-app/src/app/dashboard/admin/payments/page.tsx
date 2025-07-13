'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Download,
  Settings
} from 'lucide-react';

interface AdminPaymentData {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  totalTransactions: number;
  recentTransactions: AdminTransaction[];
  subscriptionBreakdown: SubscriptionBreakdown[];
  paymentMethods: PaymentMethodStats[];
  failedPayments: FailedPayment[];
}

interface AdminTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'purchase' | 'subscription' | 'refund';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  stripePaymentIntentId?: string;
}

interface SubscriptionBreakdown {
  plan: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface PaymentMethodStats {
  type: string;
  count: number;
  percentage: number;
}

interface FailedPayment {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  reason: string;
  date: string;
  retryCount: number;
}

export default function AdminPaymentsPage() {
  const { user, isLoaded } = useUser();
  const [paymentData, setPaymentData] = useState<AdminPaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadAdminPaymentData = async () => {
    try {
      const response = await fetch('/api/admin/payments');
      const data = await response.json();

      if (response.ok) {
        setPaymentData(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load admin payment data');
      }
    } catch (error) {
      console.error('Error loading admin payment data:', error);
      setError('Failed to load payment information');
      // Set demo data for development
      setPaymentData({
        totalRevenue: 12450.00,
        monthlyRevenue: 3200.00,
        activeSubscriptions: 156,
        totalTransactions: 1247,
        recentTransactions: [
          {
            id: 'txn_1',
            userId: 'user_1',
            userEmail: 'patient@example.com',
            type: 'subscription',
            description: 'Premium Plan Subscription',
            amount: 60.00,
            status: 'completed',
            date: new Date().toISOString(),
            stripePaymentIntentId: 'pi_demo_123'
          },
          {
            id: 'txn_2',
            userId: 'user_2',
            userEmail: 'patient2@example.com',
            type: 'purchase',
            description: '20 Credit Package',
            amount: 40.00,
            status: 'completed',
            date: new Date(Date.now() - 86400000).toISOString(),
            stripePaymentIntentId: 'pi_demo_124'
          }
        ],
        subscriptionBreakdown: [
          { plan: 'Premium', count: 45, revenue: 2700, percentage: 35 },
          { plan: 'Standard', count: 67, revenue: 2010, percentage: 43 },
          { plan: 'Basic', count: 44, revenue: 880, percentage: 22 }
        ],
        paymentMethods: [
          { type: 'Visa', count: 89, percentage: 57 },
          { type: 'Mastercard', count: 45, percentage: 29 },
          { type: 'American Express', count: 22, percentage: 14 }
        ],
        failedPayments: [
          {
            id: 'fail_1',
            userId: 'user_3',
            userEmail: 'patient3@example.com',
            amount: 30.00,
            reason: 'Insufficient funds',
            date: new Date().toISOString(),
            retryCount: 2
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadAdminPaymentData();
    }
  }, [isLoaded, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAdminPaymentData();
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
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredTransactions = paymentData?.recentTransactions.filter(transaction => {
    const matchesSearch = transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || transaction.status === filterStatus;
    return matchesSearch && matchesFilter;
  }) || [];

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
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
          <h1 className="text-3xl font-bold text-foreground">Payment Administration</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage all payment transactions and subscriptions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
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
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(paymentData?.totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All-time revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(paymentData?.monthlyRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This month's revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentData?.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Current subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentData?.totalTransactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              All transactions
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscription Breakdown</TabsTrigger>
            <TabsTrigger value="failed">Failed Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Latest payment transactions across the platform
                </CardDescription>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by email or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="filter">Filter by Status</Label>
                    <select
                      id="filter"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(transaction.status)}
                        <div>
                          <p className="font-medium">{transaction.userEmail}</p>
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${transaction.amount.toFixed(2)}</p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan Breakdown</CardTitle>
                <CardDescription>
                  Distribution of active subscription plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentData?.subscriptionBreakdown.map((plan) => (
                    <div key={plan.plan} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{plan.plan} Plan</p>
                        <p className="text-sm text-muted-foreground">{plan.count} subscribers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${plan.revenue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{plan.percentage}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Failed Payments</CardTitle>
                <CardDescription>
                  Payments that require attention or retry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentData?.failedPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg border-red-200">
                      <div className="flex items-center space-x-4">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">{payment.userEmail}</p>
                          <p className="text-sm text-muted-foreground">{payment.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            Retries: {payment.retryCount} | {new Date(payment.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${payment.amount.toFixed(2)}</p>
                        <Button size="sm" variant="outline">
                          Retry Payment
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Distribution of payment methods used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentData?.paymentMethods.map((method) => (
                      <div key={method.type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{method.type}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{method.count}</span>
                          <span className="text-sm text-muted-foreground ml-2">({method.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>
                    Monthly revenue performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Revenue chart will be implemented here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
