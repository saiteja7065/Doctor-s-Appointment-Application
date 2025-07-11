'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Plus, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

interface CreditBalanceData {
  creditBalance: number;
  totalSpent: number;
  totalAppointments: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
}

interface CreditBalanceProps {
  className?: string;
  showDetails?: boolean;
  showPurchaseButton?: boolean;
}

export function CreditBalance({ 
  className = '', 
  showDetails = true, 
  showPurchaseButton = true 
}: CreditBalanceProps) {
  const { user, isLoaded } = useUser();
  const [creditData, setCreditData] = useState<CreditBalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchCreditBalance();
    }
  }, [isLoaded, user]);

  const fetchCreditBalance = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/patients/profile/${user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setCreditData({
          creditBalance: data.creditBalance || 0,
          totalSpent: data.totalSpent || 0,
          totalAppointments: data.totalAppointments || 0,
          subscriptionPlan: data.subscriptionPlan || 'free',
          subscriptionStatus: data.subscriptionStatus || 'inactive'
        });
      } else {
        setError('Failed to fetch credit balance');
      }
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      setError('Error loading credit information');
    } finally {
      setIsLoading(false);
    }
  };

  const getCreditStatusColor = (balance: number) => {
    if (balance >= 10) return 'default';
    if (balance >= 5) return 'secondary';
    if (balance >= 2) return 'outline';
    return 'destructive';
  };

  const getCreditStatusText = (balance: number) => {
    if (balance >= 10) return 'Excellent';
    if (balance >= 5) return 'Good';
    if (balance >= 2) return 'Low';
    return 'Critical';
  };

  if (!isLoaded || isLoading) {
    return (
      <Card className={`glass-card ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          {showDetails && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (error || !creditData) {
    return (
      <Card className={`glass-card border-destructive/20 ${className}`}>
        <CardContent className="p-6 text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {error || 'Unable to load credit information'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchCreditBalance}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-primary" />
            Credit Balance
          </CardTitle>
          <Badge variant={getCreditStatusColor(creditData.creditBalance)}>
            {getCreditStatusText(creditData.creditBalance)}
          </Badge>
        </div>
        {showDetails && (
          <CardDescription>
            Manage your consultation credits
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">
            {creditData.creditBalance}
          </div>
          <p className="text-sm text-muted-foreground">Available Credits</p>
        </div>

        {showDetails && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-muted">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium">{creditData.totalSpent}</span>
                </div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-sm font-medium">{creditData.totalAppointments}</span>
                </div>
                <p className="text-xs text-muted-foreground">Appointments</p>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <Badge variant="outline" className="capitalize">
                  {creditData.subscriptionPlan}
                </Badge>
              </div>
            </div>
          </>
        )}

        {/* Purchase Button */}
        {showPurchaseButton && (
          <div className="pt-2">
            {creditData.creditBalance < 2 ? (
              <Link href="/dashboard/patient/subscription" className="block">
                <Button className="w-full" variant="default">
                  <Plus className="h-4 w-4 mr-2" />
                  Buy Credits (Required)
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/patient/subscription" className="block">
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Buy More Credits
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Low Credit Warning */}
        {creditData.creditBalance < 2 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Low Credit Balance
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              You need at least 2 credits to book an appointment. Purchase more credits to continue.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CreditDisplayProps {
  balance: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CreditDisplay({ balance, className = '', size = 'md' }: CreditDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <CreditCard className={`h-4 w-4 text-primary ${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : ''}`} />
      <span className={`font-medium ${sizeClasses[size]}`}>
        {balance} {balance === 1 ? 'credit' : 'credits'}
      </span>
    </div>
  );
}

export default CreditBalance;
