'use client';

import React, { ComponentType, useEffect, useState } from 'react';
import { useRealTimeData, RealTimeDataOptions } from '@/hooks/useRealTimeData';
import { useNotifications } from '@/contexts/NotificationContext';
import StatusIndicator from '@/components/notifications/StatusIndicator';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface WithRealTimeDataProps {
  realTimeData?: any;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
  isStale?: boolean;
  refetch?: () => Promise<void>;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
}

export interface RealTimeDataConfig extends RealTimeDataOptions {
  showConnectionStatus?: boolean;
  showLastUpdated?: boolean;
  showRefreshButton?: boolean;
  autoRefreshOnError?: boolean;
  errorRetryInterval?: number;
  loadingComponent?: ComponentType;
  errorComponent?: ComponentType<{ error: string; onRetry: () => void }>;
}

export function withRealTimeData<P extends object>(
  WrappedComponent: ComponentType<P & WithRealTimeDataProps>,
  config: RealTimeDataConfig
) {
  const {
    showConnectionStatus = true,
    showLastUpdated = true,
    showRefreshButton = true,
    autoRefreshOnError = true,
    errorRetryInterval = 10000,
    loadingComponent: LoadingComponent,
    errorComponent: ErrorComponent,
    ...dataOptions
  } = config;

  return function WithRealTimeDataComponent(props: P) {
    const { state: notificationState } = useNotifications();
    const [retryCount, setRetryCount] = useState(0);
    const [isManualRefresh, setIsManualRefresh] = useState(false);

    const {
      data,
      isLoading,
      error,
      lastUpdated,
      isStale,
      refetch
    } = useRealTimeData({
      ...dataOptions,
      onError: (error) => {
        console.error('Real-time data error:', error);
        dataOptions.onError?.(error);
        
        if (autoRefreshOnError && retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            refetch();
          }, errorRetryInterval);
        }
      },
      onSuccess: (data) => {
        setRetryCount(0); // Reset retry count on success
        dataOptions.onSuccess?.(data);
      }
    });

    const handleManualRefresh = async () => {
      setIsManualRefresh(true);
      try {
        await refetch();
      } finally {
        setIsManualRefresh(false);
      }
    };

    // Show loading component if provided and loading
    if (isLoading && !data && LoadingComponent) {
      return <LoadingComponent />;
    }

    // Show error component if provided and error exists
    if (error && !data && ErrorComponent) {
      return <ErrorComponent error={error} onRetry={handleManualRefresh} />;
    }

    const connectionStatus = notificationState.connectionStatus;

    return (
      <div className="relative">
        {/* Connection and Status Bar */}
        {(showConnectionStatus || showLastUpdated || showRefreshButton) && (
          <div className="flex items-center justify-between mb-4 p-2 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              {showConnectionStatus && (
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : connectionStatus === 'disconnected' ? (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
                  )}
                  <Badge 
                    variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {connectionStatus}
                  </Badge>
                </div>
              )}

              {/* Data Status */}
              {(isLoading || error || isStale) && (
                <StatusIndicator
                  status={error ? 'error' : isLoading ? 'loading' : isStale ? 'warning' : 'success'}
                  type="connection"
                  message={
                    error ? 'Connection error' :
                    isLoading ? 'Updating...' :
                    isStale ? 'Data may be outdated' :
                    'Connected'
                  }
                  variant="compact"
                  showMessage={false}
                />
              )}

              {/* Last Updated */}
              {showLastUpdated && lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatRelativeTime(lastUpdated)}
                </span>
              )}
            </div>

            {/* Refresh Button */}
            {showRefreshButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isLoading || isManualRefresh}
                className="h-8 px-2"
              >
                <RefreshCw 
                  className={`h-4 w-4 ${(isLoading || isManualRefresh) ? 'animate-spin' : ''}`} 
                />
              </Button>
            )}
          </div>
        )}

        {/* Error Banner */}
        {error && data && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  Unable to fetch latest data. Showing cached version.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isManualRefresh}
                className="text-red-700 border-red-300"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Wrapped Component */}
        <WrappedComponent
          {...props}
          realTimeData={data}
          isLoading={isLoading}
          error={error}
          lastUpdated={lastUpdated}
          isStale={isStale}
          refetch={refetch}
          connectionStatus={connectionStatus}
        />
      </div>
    );
  };
}

// Utility function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}

// Default loading component
export const DefaultLoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center gap-3">
      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

// Default error component
export const DefaultErrorComponent: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <WifiOff className="h-8 w-8 text-red-500 mb-3" />
    <h3 className="font-semibold text-lg mb-2">Connection Error</h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-md">
      {error}
    </p>
    <Button onClick={onRetry} variant="outline">
      <RefreshCw className="h-4 w-4 mr-2" />
      Try Again
    </Button>
  </div>
);

// Preset configurations for common use cases
export const realTimeConfigs = {
  appointments: {
    endpoint: '/api/appointments',
    interval: 15000,
    showConnectionStatus: true,
    showLastUpdated: true,
    showRefreshButton: true,
    autoRefreshOnError: true,
  },
  notifications: {
    endpoint: '/api/notifications',
    interval: 10000,
    showConnectionStatus: false,
    showLastUpdated: false,
    showRefreshButton: false,
    autoRefreshOnError: true,
  },
  subscription: {
    endpoint: '/api/subscription',
    interval: 60000,
    showConnectionStatus: true,
    showLastUpdated: true,
    showRefreshButton: true,
    autoRefreshOnError: true,
  },
  consultations: {
    endpoint: '/api/consultations',
    interval: 5000,
    showConnectionStatus: true,
    showLastUpdated: false,
    showRefreshButton: true,
    autoRefreshOnError: true,
  },
};
