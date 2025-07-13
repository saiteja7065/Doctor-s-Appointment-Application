'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Building,
  Smartphone,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (withdrawalData: any) => void;
  availableBalance: number;
  isLoading?: boolean;
}

interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
}

export function WithdrawalModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  availableBalance,
  isLoading = false 
}: WithdrawalModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'bank_transfer' | 'paypal' | 'upi'>('bank_transfer');
  const [amount, setAmount] = useState<string>('');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    bankName: ''
  });
  const [paypalEmail, setPaypalEmail] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const minWithdrawal = 10;
  const maxWithdrawal = availableBalance;

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (!amount || isNaN(withdrawalAmount)) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (withdrawalAmount < minWithdrawal) {
      newErrors.amount = `Minimum withdrawal amount is ${minWithdrawal} credits`;
    } else if (withdrawalAmount > maxWithdrawal) {
      newErrors.amount = `Maximum withdrawal amount is ${maxWithdrawal} credits`;
    }

    // Validate payment method details
    switch (selectedMethod) {
      case 'bank_transfer':
        if (!bankDetails.accountHolderName.trim()) {
          newErrors.accountHolderName = 'Account holder name is required';
        }
        if (!bankDetails.accountNumber.trim()) {
          newErrors.accountNumber = 'Account number is required';
        }
        if (!bankDetails.routingNumber.trim()) {
          newErrors.routingNumber = 'Routing number is required';
        }
        if (!bankDetails.bankName.trim()) {
          newErrors.bankName = 'Bank name is required';
        }
        break;
      case 'paypal':
        if (!paypalEmail.trim()) {
          newErrors.paypalEmail = 'PayPal email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
          newErrors.paypalEmail = 'Please enter a valid email address';
        }
        break;
      case 'upi':
        if (!upiId.trim()) {
          newErrors.upiId = 'UPI ID is required';
        } else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
          newErrors.upiId = 'Please enter a valid UPI ID';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const withdrawalData = {
      amount: parseFloat(amount),
      method: selectedMethod,
      bankDetails: selectedMethod === 'bank_transfer' ? bankDetails : undefined,
      paypalEmail: selectedMethod === 'paypal' ? paypalEmail : undefined,
      upiId: selectedMethod === 'upi' ? upiId : undefined
    };

    onSubmit(withdrawalData);
  };

  const handleClose = () => {
    if (!isLoading) {
      setAmount('');
      setBankDetails({
        accountHolderName: '',
        accountNumber: '',
        routingNumber: '',
        bankName: ''
      });
      setPaypalEmail('');
      setUpiId('');
      setErrors({});
      onClose();
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return <Building className="h-5 w-5" />;
      case 'paypal':
        return <CreditCard className="h-5 w-5" />;
      case 'upi':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getProcessingTime = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return '3-5 business days';
      case 'paypal':
        return '1-2 business days';
      case 'upi':
        return 'Instant to 24 hours';
      default:
        return 'Varies';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Request Withdrawal</span>
          </DialogTitle>
          <DialogDescription>
            Withdraw your earned credits to your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Available Balance */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-green-600">{availableBalance} credits</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Minimum Withdrawal</p>
                  <p className="text-lg font-semibold">{minWithdrawal} credits</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount (Credits)</Label>
            <Input
              id="amount"
              type="number"
              placeholder={`Enter amount (${minWithdrawal} - ${maxWithdrawal})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minWithdrawal}
              max={maxWithdrawal}
              disabled={isLoading}
            />
            {errors.amount && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label>Select Withdrawal Method</Label>
            <Tabs value={selectedMethod} onValueChange={(value: any) => setSelectedMethod(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bank_transfer" className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Bank Transfer</span>
                </TabsTrigger>
                <TabsTrigger value="paypal" className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>PayPal</span>
                </TabsTrigger>
                <TabsTrigger value="upi" className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>UPI</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank_transfer" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="h-5 w-5" />
                      <span>Bank Transfer Details</span>
                    </CardTitle>
                    <CardDescription>
                      Processing time: {getProcessingTime('bank_transfer')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          placeholder="Full name as on account"
                          value={bankDetails.accountHolderName}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, accountHolderName: e.target.value }))}
                          disabled={isLoading}
                        />
                        {errors.accountHolderName && (
                          <p className="text-sm text-red-600">{errors.accountHolderName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="Name of your bank"
                          value={bankDetails.bankName}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                          disabled={isLoading}
                        />
                        {errors.bankName && (
                          <p className="text-sm text-red-600">{errors.bankName}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          placeholder="Your account number"
                          value={bankDetails.accountNumber}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                          disabled={isLoading}
                        />
                        {errors.accountNumber && (
                          <p className="text-sm text-red-600">{errors.accountNumber}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="routingNumber">Routing Number</Label>
                        <Input
                          id="routingNumber"
                          placeholder="Bank routing number"
                          value={bankDetails.routingNumber}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, routingNumber: e.target.value }))}
                          disabled={isLoading}
                        />
                        {errors.routingNumber && (
                          <p className="text-sm text-red-600">{errors.routingNumber}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="paypal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>PayPal Details</span>
                    </CardTitle>
                    <CardDescription>
                      Processing time: {getProcessingTime('paypal')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paypalEmail">PayPal Email Address</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        placeholder="your.email@example.com"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        disabled={isLoading}
                      />
                      {errors.paypalEmail && (
                        <p className="text-sm text-red-600">{errors.paypalEmail}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upi" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Smartphone className="h-5 w-5" />
                      <span>UPI Details</span>
                    </CardTitle>
                    <CardDescription>
                      Processing time: {getProcessingTime('upi')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input
                        id="upiId"
                        placeholder="yourname@paytm"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        disabled={isLoading}
                      />
                      {errors.upiId && (
                        <p className="text-sm text-red-600">{errors.upiId}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Important Information */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">Important Information</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Withdrawal requests are processed manually by our admin team</li>
                    <li>• Processing times may vary depending on the payment method</li>
                    <li>• You will receive email notifications about your withdrawal status</li>
                    <li>• Minimum withdrawal amount is {minWithdrawal} credits</li>
                    <li>• Ensure all payment details are accurate to avoid delays</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !amount || parseFloat(amount) < minWithdrawal}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Submitting...' : 'Submit Withdrawal Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
