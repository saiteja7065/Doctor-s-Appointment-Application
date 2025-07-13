'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus' | 'subscription' | 'withdrawal' | 'earning';
  description: string;
  credits: number;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
}

interface PaymentHistoryProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function PaymentHistory({ transactions, isLoading = false, onRefresh }: PaymentHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'purchase' | 'usage' | 'subscription'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'credits'>('date');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'refunded':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'subscription':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'usage':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'refund':
      case 'bonus':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTransactions = transactions
    .filter(tx => filter === 'all' || tx.type === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amount':
          return b.amount - a.amount;
        case 'credits':
          return Math.abs(b.credits) - Math.abs(a.credits);
        default:
          return 0;
      }
    });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment History
            </CardTitle>
            <CardDescription>
              Track your credit purchases, usage, and subscription payments
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 pt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All</option>
              <option value="purchase">Purchases</option>
              <option value="usage">Usage</option>
              <option value="subscription">Subscriptions</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="credits">Credits</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400">
              {filter !== 'all' ? 'Try changing the filter' : 'Your payment history will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-full bg-gray-100">
                    {getTypeIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(transaction.date), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`font-medium ${transaction.credits > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.credits > 0 ? '+' : ''}{transaction.credits} credits
                    </div>
                    {transaction.amount > 0 && (
                      <div className="text-sm text-gray-500">
                        {formatAmount(transaction.amount)}
                      </div>
                    )}
                  </div>
                  <Badge className={getStatusColor(transaction.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(transaction.status)}
                      <span className="capitalize">{transaction.status}</span>
                    </div>
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
