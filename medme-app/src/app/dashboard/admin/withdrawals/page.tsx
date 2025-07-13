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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Download,
  Building,
  CreditCard,
  Smartphone
} from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  requestId: string;
  doctorName: string;
  doctorEmail: string;
  amount: number;
  method: string;
  status: string;
  requestDate: string;
  processedDate?: string;
  completedDate?: string;
  bankDetails?: any;
  paypalEmail?: string;
  upiId?: string;
  notes?: string;
  adminNotes?: string;
}

export default function AdminWithdrawalsPage() {
  const { user, isLoaded } = useUser();
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const loadWithdrawalRequests = async () => {
    try {
      const response = await fetch('/api/admin/withdrawals');
      const data = await response.json();

      if (response.ok) {
        setWithdrawalRequests(data.requests || []);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load withdrawal requests');
      }
    } catch (error) {
      console.error('Error loading withdrawal requests:', error);
      setError('Failed to load withdrawal requests');
      // Set demo data for development
      setWithdrawalRequests([
        {
          id: '1',
          requestId: 'WR_1234567890',
          doctorName: 'Dr. John Smith',
          doctorEmail: 'john.smith@example.com',
          amount: 150,
          method: 'bank_transfer',
          status: 'pending',
          requestDate: new Date().toISOString(),
          bankDetails: {
            accountHolderName: 'John Smith',
            accountNumber: '1234567890',
            routingNumber: '123456789',
            bankName: 'Example Bank'
          },
          notes: 'Regular monthly withdrawal'
        },
        {
          id: '2',
          requestId: 'WR_0987654321',
          doctorName: 'Dr. Sarah Johnson',
          doctorEmail: 'sarah.johnson@example.com',
          amount: 75,
          method: 'paypal',
          status: 'processing',
          requestDate: new Date(Date.now() - 86400000).toISOString(),
          processedDate: new Date().toISOString(),
          paypalEmail: 'sarah.johnson@paypal.com'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadWithdrawalRequests();
    }
  }, [isLoaded, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadWithdrawalRequests();
    setIsRefreshing(false);
  };

  const handleProcessWithdrawal = async (requestId: string, status: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_withdrawal',
          requestId,
          status,
          adminNotes,
          transactionId: status === 'completed' ? transactionId : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Withdrawal ${status} successfully`);
        setSelectedRequest(null);
        setAdminNotes('');
        setTransactionId('');
        await loadWithdrawalRequests();
      } else {
        throw new Error(data.error || 'Failed to process withdrawal');
      }
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      alert(error.message || 'Failed to process withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return <Building className="h-4 w-4" />;
      case 'paypal':
        return <CreditCard className="h-4 w-4" />;
      case 'upi':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const filteredRequests = withdrawalRequests.filter(request => {
    const matchesSearch = request.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.doctorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Withdrawal Management</h1>
          <p className="text-muted-foreground mt-2">
            Review and process doctor withdrawal requests
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex space-x-4"
      >
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doctor name, email, or request ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </motion.div>

      {/* Withdrawal Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>
              Manage and process doctor withdrawal requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No withdrawal requests found</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(request.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{request.doctorName}</p>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{request.doctorEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          Request ID: {request.requestId} | {new Date(request.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{request.amount} credits</p>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          {getMethodIcon(request.method)}
                          <span>{request.method.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Withdrawal Request Details</DialogTitle>
                            <DialogDescription>
                              Review and process withdrawal request {request.requestId}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedRequest && (
                            <div className="space-y-6">
                              {/* Request Information */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Doctor</Label>
                                  <p className="font-medium">{selectedRequest.doctorName}</p>
                                  <p className="text-sm text-muted-foreground">{selectedRequest.doctorEmail}</p>
                                </div>
                                <div>
                                  <Label>Amount</Label>
                                  <p className="font-medium">{selectedRequest.amount} credits</p>
                                </div>
                                <div>
                                  <Label>Method</Label>
                                  <p className="font-medium">{selectedRequest.method.replace('_', ' ')}</p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  {getStatusBadge(selectedRequest.status)}
                                </div>
                              </div>

                              {/* Payment Details */}
                              <div>
                                <Label>Payment Details</Label>
                                <Card className="mt-2">
                                  <CardContent className="pt-4">
                                    {selectedRequest.method === 'bank_transfer' && selectedRequest.bankDetails && (
                                      <div className="space-y-2">
                                        <p><strong>Account Holder:</strong> {selectedRequest.bankDetails.accountHolderName}</p>
                                        <p><strong>Bank:</strong> {selectedRequest.bankDetails.bankName}</p>
                                        <p><strong>Account Number:</strong> {selectedRequest.bankDetails.accountNumber}</p>
                                        <p><strong>Routing Number:</strong> {selectedRequest.bankDetails.routingNumber}</p>
                                      </div>
                                    )}
                                    {selectedRequest.method === 'paypal' && (
                                      <p><strong>PayPal Email:</strong> {selectedRequest.paypalEmail}</p>
                                    )}
                                    {selectedRequest.method === 'upi' && (
                                      <p><strong>UPI ID:</strong> {selectedRequest.upiId}</p>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Admin Actions */}
                              {selectedRequest.status === 'pending' && (
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="adminNotes">Admin Notes</Label>
                                    <Textarea
                                      id="adminNotes"
                                      placeholder="Add notes about this withdrawal..."
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() => handleProcessWithdrawal(selectedRequest.requestId, 'processing')}
                                      disabled={isProcessing}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Mark as Processing
                                    </Button>
                                    <Button
                                      onClick={() => handleProcessWithdrawal(selectedRequest.requestId, 'cancelled')}
                                      disabled={isProcessing}
                                      variant="destructive"
                                    >
                                      Cancel Request
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {selectedRequest.status === 'processing' && (
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="transactionId">Transaction ID</Label>
                                    <Input
                                      id="transactionId"
                                      placeholder="Enter external transaction ID..."
                                      value={transactionId}
                                      onChange={(e) => setTransactionId(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="adminNotes">Admin Notes</Label>
                                    <Textarea
                                      id="adminNotes"
                                      placeholder="Add completion notes..."
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() => handleProcessWithdrawal(selectedRequest.requestId, 'completed')}
                                      disabled={isProcessing || !transactionId}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Mark as Completed
                                    </Button>
                                    <Button
                                      onClick={() => handleProcessWithdrawal(selectedRequest.requestId, 'failed')}
                                      disabled={isProcessing}
                                      variant="destructive"
                                    >
                                      Mark as Failed
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
