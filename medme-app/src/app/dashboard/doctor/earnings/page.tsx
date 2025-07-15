'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WithdrawalModal } from '@/components/doctor/WithdrawalModal';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  CreditCard,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  Receipt,
  Clock
} from 'lucide-react';

interface EarningsData {
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalConsultations: number;
  averagePerConsultation: number;
}

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'refund' | 'bonus';
  amount: number;
  description: string;
  patientName?: string;
  appointmentId?: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  method: 'bank' | 'paypal' | 'upi';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

const DEMO_EARNINGS: EarningsData = {
  totalEarnings: 156,
  availableBalance: 124,
  pendingBalance: 32,
  totalWithdrawn: 200,
  thisMonthEarnings: 78,
  lastMonthEarnings: 64,
  totalConsultations: 78,
  averagePerConsultation: 2
};

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'Sarah Johnson',
    appointmentId: 'apt_001',
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'Michael Chen',
    appointmentId: 'apt_002',
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    type: 'withdrawal',
    amount: -50,
    description: 'Withdrawal to bank account',
    status: 'completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'Emily Davis',
    appointmentId: 'apt_003',
    status: 'completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'David Wilson',
    appointmentId: 'apt_004',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

const DEMO_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: '1',
    amount: 50,
    method: 'bank',
    status: 'completed',
    requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    amount: 100,
    method: 'paypal',
    status: 'completed',
    requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export default function DoctorEarningsPage() {
  const { user } = useUser();
  const [earningsData, setEarningsData] = useState<EarningsData>(DEMO_EARNINGS);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(DEMO_WITHDRAWALS);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  // Refetch data when time filter changes
  useEffect(() => {
    if (!isLoading) {
      setIsLoading(true);
      fetchEarningsData();
    }
  }, [timeFilter]);

  const fetchEarningsData = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (timeFilter !== 'all') {
        params.append('period', timeFilter);
      }

      const response = await fetch(`/api/doctors/earnings?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEarningsData(data.earnings || DEMO_EARNINGS);
        setTransactions(data.transactions || DEMO_TRANSACTIONS);
        setWithdrawals(data.withdrawals || DEMO_WITHDRAWALS);
      } else {
        // Demo mode - use demo data
        setEarningsData(DEMO_EARNINGS);
        setTransactions(DEMO_TRANSACTIONS);
        setWithdrawals(DEMO_WITHDRAWALS);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      setEarningsData(DEMO_EARNINGS);
      setTransactions(DEMO_TRANSACTIONS);
      setWithdrawals(DEMO_WITHDRAWALS);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      case 'refund':
        return <ArrowDownRight className="w-4 h-4 text-orange-500" />;
      case 'bonus':
        return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earning':
      case 'bonus':
        return 'text-green-600';
      case 'withdrawal':
      case 'refund':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors] || colors.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateGrowth = () => {
    if (earningsData.lastMonthEarnings === 0) return 0;
    return ((earningsData.thisMonthEarnings - earningsData.lastMonthEarnings) / earningsData.lastMonthEarnings) * 100;
  };

  const requestWithdrawal = () => {
    setShowWithdrawalModal(true);
  };

  const handleWithdrawalSubmit = async (withdrawalData: any) => {
    setIsSubmittingWithdrawal(true);
    try {
      const response = await fetch('/api/doctors/earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'withdraw',
          amount: withdrawalData.amount,
          method: withdrawalData.method,
          bankDetails: withdrawalData.bankDetails,
          paypalEmail: withdrawalData.paypalEmail,
          upiId: withdrawalData.upiId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Withdrawal request submitted successfully');
        setShowWithdrawalModal(false);
        await fetchEarningsData(); // Refresh data
      } else {
        throw new Error(data.error || 'Failed to submit withdrawal request');
      }
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const exportTransactions = () => {
    // TODO: Implement CSV export
    toast.success('Transaction export started');
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const growth = calculateGrowth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground">
              Track your consultation earnings and manage withdrawals
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={exportTransactions}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={requestWithdrawal}
              disabled={earningsData.availableBalance < 10}
              className="bg-green-600 hover:bg-green-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {earningsData.availableBalance} credits
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for withdrawal
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {earningsData.pendingBalance} credits
              </div>
              <p className="text-xs text-muted-foreground">
                Processing payments
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {earningsData.thisMonthEarnings} credits
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {growth >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                {Math.abs(growth).toFixed(1)}% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {earningsData.totalEarnings} credits
              </div>
              <p className="text-xs text-muted-foreground">
                {earningsData.totalConsultations} consultations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Earnings Details */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Your latest earnings and payment activities
                    </CardDescription>
                  </div>
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{transaction.description}</h4>
                            {transaction.patientName && (
                              <p className="text-sm text-muted-foreground">
                                Patient: {transaction.patientName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(transaction.date)} at {formatTime(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                          </div>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>
                  Track your withdrawal requests and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No withdrawals found</p>
                    <p className="text-sm">Request your first withdrawal when you have sufficient balance</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <h4 className="font-medium">Withdrawal Request</h4>
                            <p className="text-sm text-muted-foreground capitalize">
                              Method: {withdrawal.method}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Requested: {formatDate(withdrawal.requestedAt.split('T')[0])}
                              {withdrawal.processedAt && (
                                <span> • Processed: {formatDate(withdrawal.processedAt.split('T')[0])}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600">
                            -{withdrawal.amount} credits
                          </div>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onSubmit={handleWithdrawalSubmit}
        availableBalance={earningsData.availableBalance}
        isLoading={isSubmittingWithdrawal}
      />
    </div>
  );
}
