'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Plus,
  Trash2,
  Shield,
  Bell,
  Settings,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card';
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface PaymentSettings {
  autoRecharge: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  receiptEmails: boolean;
  lowBalanceAlerts: boolean;
  subscriptionReminders: boolean;
}

interface BillingHistory {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

export default function PaymentSettingsPage() {
  const { user, isLoaded } = useUser();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    autoRecharge: false,
    autoRechargeThreshold: 2,
    autoRechargeAmount: 10,
    emailNotifications: true,
    smsNotifications: false,
    receiptEmails: true,
    lowBalanceAlerts: true,
    subscriptionReminders: true
  });
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState<{ [key: string]: boolean }>({});

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch('/api/payments/settings');
      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(data.paymentMethods || []);
        setPaymentSettings(data.settings || paymentSettings);
        setBillingHistory(data.billingHistory || []);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to load payment settings');
      }
    } catch (error) {
      console.error('Error loading payment settings:', error);
      setError('Failed to load payment settings');
      // Set demo data for development
      setPaymentMethods([
        {
          id: 'pm_demo_1',
          type: 'card',
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true,
          billingAddress: {
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'US'
          }
        },
        {
          id: 'pm_demo_2',
          type: 'card',
          brand: 'mastercard',
          last4: '5555',
          expiryMonth: 8,
          expiryYear: 2026,
          isDefault: false
        }
      ]);
      setBillingHistory([
        {
          id: 'inv_demo_1',
          date: new Date().toISOString(),
          description: 'Premium Plan Subscription',
          amount: 60.00,
          status: 'paid',
          downloadUrl: '/api/invoices/demo_1/download'
        },
        {
          id: 'inv_demo_2',
          date: new Date(Date.now() - 86400000 * 30).toISOString(),
          description: '20 Credit Package',
          amount: 40.00,
          status: 'paid',
          downloadUrl: '/api/invoices/demo_2/download'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadPaymentSettings();
    }
  }, [isLoaded, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPaymentSettings();
    setIsRefreshing(false);
  };

  const handleAddPaymentMethod = async () => {
    try {
      // Create Stripe setup intent for adding payment method
      const response = await fetch('/api/payments/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/patient/settings/payment`
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe setup page
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create setup session');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      alert('Failed to add payment method. Please try again.');
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      const response = await fetch('/api/payments/payment-methods', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
        alert('Payment method removed successfully');
      } else {
        throw new Error(data.error || 'Failed to remove payment method');
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      alert('Failed to remove payment method. Please try again.');
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      const response = await fetch('/api/payments/payment-methods', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId, action: 'set_default' }),
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(prev => prev.map(pm => ({
          ...pm,
          isDefault: pm.id === paymentMethodId
        })));
        alert('Default payment method updated');
      } else {
        throw new Error(data.error || 'Failed to update default payment method');
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      alert('Failed to update default payment method. Please try again.');
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<PaymentSettings>) => {
    try {
      const updatedSettings = { ...paymentSettings, ...newSettings };
      
      const response = await fetch('/api/payments/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: updatedSettings }),
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentSettings(updatedSettings);
      } else {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings. Please try again.');
    }
  };

  const toggleCardDetails = (cardId: string) => {
    setShowCardDetails(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const getCardIcon = (brand: string) => {
    return <CreditCard className="h-5 w-5" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive'
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
          <h1 className="text-3xl font-bold text-foreground">Payment Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your payment methods, billing preferences, and transaction history
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

      {/* Payment Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs defaultValue="methods" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="settings">Preferences</TabsTrigger>
            <TabsTrigger value="history">Billing History</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="methods" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>
                      Manage your saved payment methods for subscriptions and credit purchases
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddPaymentMethod}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No payment methods added yet</p>
                      <Button onClick={handleAddPaymentMethod} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Payment Method
                      </Button>
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getCardIcon(method.brand)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">
                                {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} •••• {method.last4}
                              </p>
                              {method.isDefault && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                            </p>
                            {showCardDetails[method.id] && method.billingAddress && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <p>{method.billingAddress.line1}</p>
                                <p>{method.billingAddress.city}, {method.billingAddress.state} {method.billingAddress.postalCode}</p>
                                <p>{method.billingAddress.country}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCardDetails(method.id)}
                          >
                            {showCardDetails[method.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {!method.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Recharge Settings</CardTitle>
                  <CardDescription>
                    Automatically purchase credits when your balance runs low
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-recharge">Enable Auto-Recharge</Label>
                    <Switch
                      id="auto-recharge"
                      checked={paymentSettings.autoRecharge}
                      onCheckedChange={(checked) => 
                        handleUpdateSettings({ autoRecharge: checked })
                      }
                    />
                  </div>
                  {paymentSettings.autoRecharge && (
                    <>
                      <div className="space-y-2">
                        <Label>Recharge when balance drops below</Label>
                        <select
                          value={paymentSettings.autoRechargeThreshold}
                          onChange={(e) => 
                            handleUpdateSettings({ autoRechargeThreshold: parseInt(e.target.value) })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value={1}>1 credit</option>
                          <option value={2}>2 credits</option>
                          <option value={3}>3 credits</option>
                          <option value={5}>5 credits</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Auto-recharge amount</Label>
                        <select
                          value={paymentSettings.autoRechargeAmount}
                          onChange={(e) => 
                            handleUpdateSettings({ autoRechargeAmount: parseInt(e.target.value) })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value={5}>5 credits ($10)</option>
                          <option value={10}>10 credits ($20)</option>
                          <option value={20}>20 credits ($40)</option>
                          <option value={50}>50 credits ($100)</option>
                        </select>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to receive payment and billing notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <Switch
                      id="email-notifications"
                      checked={paymentSettings.emailNotifications}
                      onCheckedChange={(checked) => 
                        handleUpdateSettings({ emailNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="receipt-emails">Receipt Emails</Label>
                    <Switch
                      id="receipt-emails"
                      checked={paymentSettings.receiptEmails}
                      onCheckedChange={(checked) => 
                        handleUpdateSettings({ receiptEmails: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="low-balance-alerts">Low Balance Alerts</Label>
                    <Switch
                      id="low-balance-alerts"
                      checked={paymentSettings.lowBalanceAlerts}
                      onCheckedChange={(checked) => 
                        handleUpdateSettings({ lowBalanceAlerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subscription-reminders">Subscription Reminders</Label>
                    <Switch
                      id="subscription-reminders"
                      checked={paymentSettings.subscriptionReminders}
                      onCheckedChange={(checked) => 
                        handleUpdateSettings({ subscriptionReminders: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  View and download your payment receipts and invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No billing history available</p>
                    </div>
                  ) : (
                    billingHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(item.status)}
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">${item.amount.toFixed(2)}</p>
                            {getStatusBadge(item.status)}
                          </div>
                          {item.downloadUrl && item.status === 'paid' && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.downloadUrl} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security & Privacy</CardTitle>
                <CardDescription>
                  Your payment security and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-4">
                  <Shield className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Secure Payments</h4>
                    <p className="text-sm text-muted-foreground">
                      All payments are processed securely through Stripe with industry-standard encryption.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Shield className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-medium">PCI Compliance</h4>
                    <p className="text-sm text-muted-foreground">
                      We are PCI DSS compliant and never store your full credit card information.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <Shield className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-medium">Data Protection</h4>
                    <p className="text-sm text-muted-foreground">
                      Your payment data is encrypted and protected according to GDPR and CCPA regulations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
