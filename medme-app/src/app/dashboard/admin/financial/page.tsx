'use client';

import { useEffect, useState } from 'react';
// Removed framer-motion for better performance - using CSS animations
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Banknote,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Removed framer-motion dependency for better performance
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FinancialOverview {
  totalRevenue: number;
  totalCreditsIssued: number;
  totalCreditsUsed: number;
  totalDoctorEarnings: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  activeSubscriptions: number;
  totalTransactions: number;
  platformCommission: number;
  monthlyGrowth: number;
}

interface WithdrawalRequest {
  _id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  amount: number;
  method: 'bank' | 'paypal' | 'upi';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  accountDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
    paypalEmail?: string;
    upiId?: string;
  };
}

interface CreditTransaction {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  type: 'purchase' | 'deduction' | 'refund' | 'bonus';
  amount: number;
  description: string;
  appointmentId?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

interface SubscriptionData {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  plan: 'free' | 'basic' | 'standard' | 'premium';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  amount: number;
  renewalDate?: string;
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'active': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'failed':
    case 'rejected':
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'inactive':
    case 'expired': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
    case 'active': return CheckCircle;
    case 'pending': return Clock;
    case 'processing': return RefreshCw;
    case 'failed':
    case 'rejected':
    case 'cancelled': return XCircle;
    default: return AlertTriangle;
  }
};

export default function AdminFinancialPage() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const response = await fetch('/api/admin/financial');
      if (response.ok) {
        const data = await response.json();
        setOverview(data.overview);
        setWithdrawals(data.withdrawals);
        setTransactions(data.transactions);
        setSubscriptions(data.subscriptions);
      } else {
        // Demo data fallback
        setOverview({
          totalRevenue: 125750,
          totalCreditsIssued: 15420,
          totalCreditsUsed: 12890,
          totalDoctorEarnings: 89250,
          pendingWithdrawals: 15,
          completedWithdrawals: 142,
          activeSubscriptions: 1089,
          totalTransactions: 3456,
          platformCommission: 36500,
          monthlyGrowth: 12.5
        });
        
        setWithdrawals([
          {
            _id: '1',
            doctorId: 'doc_123',
            doctorName: 'Dr. Sarah Johnson',
            doctorEmail: 'sarah.johnson@email.com',
            amount: 250,
            method: 'bank',
            status: 'pending',
            requestedAt: '2025-07-11T10:30:00Z',
            accountDetails: {
              accountHolderName: 'Sarah Johnson',
              accountNumber: '****1234',
              bankName: 'Chase Bank'
            }
          },
          {
            _id: '2',
            doctorId: 'doc_456',
            doctorName: 'Dr. Michael Chen',
            doctorEmail: 'michael.chen@email.com',
            amount: 180,
            method: 'paypal',
            status: 'processing',
            requestedAt: '2025-07-10T14:20:00Z',
            accountDetails: {
              paypalEmail: 'michael.chen@email.com'
            }
          }
        ]);
        
        setTransactions([
          {
            _id: '1',
            patientId: 'pat_123',
            patientName: 'John Doe',
            patientEmail: 'john.doe@email.com',
            type: 'purchase',
            amount: 20,
            description: 'Credit purchase - Premium plan',
            status: 'completed',
            createdAt: '2025-07-11T09:15:00Z'
          },
          {
            _id: '2',
            patientId: 'pat_456',
            patientName: 'Emily Rodriguez',
            patientEmail: 'emily.rodriguez@email.com',
            type: 'deduction',
            amount: 2,
            description: 'Consultation with Dr. Sarah Johnson',
            appointmentId: 'apt_789',
            status: 'completed',
            createdAt: '2025-07-11T08:45:00Z'
          }
        ]);
        
        setSubscriptions([
          {
            _id: '1',
            patientId: 'pat_123',
            patientName: 'John Doe',
            patientEmail: 'john.doe@email.com',
            plan: 'premium',
            status: 'active',
            startDate: '2025-07-01T00:00:00Z',
            endDate: '2025-08-01T00:00:00Z',
            amount: 29.99,
            renewalDate: '2025-08-01T00:00:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await fetch(`/api/admin/financial/withdrawals/${withdrawalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      });

      if (response.ok) {
        // Update local state
        setWithdrawals(prev => 
          prev.map(withdrawal => 
            withdrawal._id === withdrawalId 
              ? { 
                  ...withdrawal, 
                  status: action === 'approve' ? 'processing' : 'rejected',
                  processedAt: new Date().toISOString(),
                  notes 
                }
              : withdrawal
          )
        );
        
        setSelectedWithdrawal(null);
      } else {
        console.error('Failed to update withdrawal status');
      }
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.doctorEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financial Oversight</h1>
            <p className="text-muted-foreground mt-1">
              Monitor transactions, withdrawals, and platform revenue
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-sm">
              {overview?.pendingWithdrawals} Pending Withdrawals
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchFinancialData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${overview?.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +{overview?.monthlyGrowth}% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits in Circulation</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {overview?.totalCreditsIssued.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview?.totalCreditsUsed.toLocaleString()} used
              </p>
            </CardContent>
          </Card>
        </div>

        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doctor Earnings</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ${overview?.totalDoctorEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {overview?.pendingWithdrawals} pending withdrawals
              </p>
            </CardContent>
          </Card>
        </div>

        <div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${overview?.platformCommission.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                From {overview?.totalTransactions.toLocaleString()} transactions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Management Tabs */}
      <div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Financial Management</CardTitle>
            <CardDescription>
              Manage withdrawals, monitor transactions, and oversee subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="withdrawals" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="withdrawals">
                  Withdrawals ({overview?.pendingWithdrawals})
                </TabsTrigger>
                <TabsTrigger value="transactions">
                  Transactions ({overview?.totalTransactions})
                </TabsTrigger>
                <TabsTrigger value="subscriptions">
                  Subscriptions ({overview?.activeSubscriptions})
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Withdrawals Tab */}
              <TabsContent value="withdrawals" className="space-y-4 mt-6">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by doctor name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {filteredWithdrawals.map((withdrawal) => (
                    <WithdrawalCard
                      key={withdrawal._id}
                      withdrawal={withdrawal}
                      onAction={handleWithdrawalAction}
                      onViewDetails={setSelectedWithdrawal}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <TransactionCard key={transaction._id} transaction={transaction} />
                  ))}
                </div>
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="space-y-4 mt-6">
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <SubscriptionCard key={subscription._id} subscription={subscription} />
                  ))}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Subscription Revenue</span>
                          <span className="font-semibold">${(overview?.totalRevenue * 0.6).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credit Sales</span>
                          <span className="font-semibold">${(overview?.totalRevenue * 0.3).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fees</span>
                          <span className="font-semibold">${(overview?.totalRevenue * 0.1).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Transaction Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Average Transaction Value</span>
                          <span className="font-semibold">
                            ${((overview?.totalRevenue || 0) / (overview?.totalTransactions || 1)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Credit Utilization Rate</span>
                          <span className="font-semibold">
                            {(((overview?.totalCreditsUsed || 0) / (overview?.totalCreditsIssued || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Growth Rate</span>
                          <span className="font-semibold text-green-600">+{overview?.monthlyGrowth}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Detail Modal */}
      {selectedWithdrawal && (
        <WithdrawalDetailModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
          onAction={handleWithdrawalAction}
        />
      )}
    </div>
  );
}

// Withdrawal Card Component
interface WithdrawalCardProps {
  withdrawal: WithdrawalRequest;
  onAction: (id: string, action: 'approve' | 'reject', notes?: string) => void;
  onViewDetails: (withdrawal: WithdrawalRequest) => void;
}

function WithdrawalCard({ withdrawal, onAction, onViewDetails }: WithdrawalCardProps) {
  const StatusIcon = getStatusIcon(withdrawal.status);

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Banknote className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{withdrawal.doctorName}</h3>
            <p className="text-sm text-muted-foreground">{withdrawal.doctorEmail}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm font-medium">${withdrawal.amount}</span>
              <span className="text-sm text-muted-foreground">
                via {withdrawal.method.toUpperCase()}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(withdrawal.requestedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(withdrawal.status)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(withdrawal)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Review
          </Button>

          {withdrawal.status === 'pending' && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => onAction(withdrawal._id, 'approve')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => onAction(withdrawal._id, 'reject')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Transaction Card Component
interface TransactionCardProps {
  transaction: CreditTransaction;
}

function TransactionCard({ transaction }: TransactionCardProps) {
  const StatusIcon = getStatusIcon(transaction.status);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-100 text-green-800';
      case 'deduction': return 'bg-blue-100 text-blue-800';
      case 'refund': return 'bg-yellow-100 text-yellow-800';
      case 'bonus': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{transaction.patientName}</h3>
            <p className="text-sm text-muted-foreground">{transaction.patientEmail}</p>
            <p className="text-sm text-muted-foreground mt-1">{transaction.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-lg font-semibold">
              {transaction.type === 'deduction' ? '-' : '+'}
              {transaction.amount} credits
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(transaction.createdAt).toLocaleDateString()}
            </p>
          </div>

          <Badge className={getTypeColor(transaction.type)}>
            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
          </Badge>

          <Badge className={getStatusColor(transaction.status)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Subscription Card Component
interface SubscriptionCardProps {
  subscription: SubscriptionData;
}

function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const StatusIcon = getStatusIcon(subscription.status);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-purple-100 text-purple-800';
      case 'premium': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{subscription.patientName}</h3>
            <p className="text-sm text-muted-foreground">{subscription.patientEmail}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-muted-foreground">
                Started: {new Date(subscription.startDate).toLocaleDateString()}
              </span>
              {subscription.renewalDate && (
                <span className="text-sm text-muted-foreground">
                  Renews: {new Date(subscription.renewalDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-lg font-semibold">${subscription.amount}</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>

          <Badge className={getPlanColor(subscription.plan)}>
            {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
          </Badge>

          <Badge className={getStatusColor(subscription.status)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Withdrawal Detail Modal Component
interface WithdrawalDetailModalProps {
  withdrawal: WithdrawalRequest;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'reject', notes?: string) => void;
}

function WithdrawalDetailModal({ withdrawal, onClose, onAction }: WithdrawalDetailModalProps) {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Withdrawal Request Review</h2>
            <Button variant="outline" onClick={onClose}>×</Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Doctor Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Doctor Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p>{withdrawal.doctorName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p>{withdrawal.doctorEmail}</p>
              </div>
            </div>
          </div>

          {/* Withdrawal Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Withdrawal Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-2xl font-bold text-green-600">${withdrawal.amount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Method</label>
                <p className="capitalize">{withdrawal.method}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge className={getStatusColor(withdrawal.status)}>
                  {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Requested</label>
                <p>{new Date(withdrawal.requestedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          {withdrawal.accountDetails && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Account Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {withdrawal.method === 'bank' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Holder</label>
                      <p>{withdrawal.accountDetails.accountHolderName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                      <p>{withdrawal.accountDetails.bankName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                      <p className="font-mono">{withdrawal.accountDetails.accountNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Routing Number</label>
                      <p className="font-mono">{withdrawal.accountDetails.routingNumber}</p>
                    </div>
                  </>
                )}

                {withdrawal.method === 'paypal' && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">PayPal Email</label>
                    <p>{withdrawal.accountDetails.paypalEmail}</p>
                  </div>
                )}

                {withdrawal.method === 'upi' && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">UPI ID</label>
                    <p className="font-mono">{withdrawal.accountDetails.upiId}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {withdrawal.status === 'pending' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Review Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
                  <Input
                    placeholder="Enter notes for approval/rejection..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onAction(withdrawal._id, 'approve', notes);
                      onClose();
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Withdrawal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onAction(withdrawal._id, 'reject', notes);
                      onClose();
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Withdrawal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
