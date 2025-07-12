'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2,
  Calendar,
  Video,
  CreditCard,
  Star,
  UserCheck,
  Wifi,
  WifiOff
} from 'lucide-react';

export interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning' | 'pending';
  type?: 'appointment' | 'payment' | 'consultation' | 'credit' | 'verification' | 'connection';
  message?: string;
  showIcon?: boolean;
  showMessage?: boolean;
  variant?: 'default' | 'compact' | 'inline';
  actionLabel?: string;
  onAction?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

const getStatusConfig = (status: StatusIndicatorProps['status'], type?: StatusIndicatorProps['type']) => {
  const configs = {
    idle: {
      icon: type === 'connection' ? Wifi : Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-muted',
      badgeVariant: 'secondary' as const,
    },
    loading: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badgeVariant: 'secondary' as const,
      animate: true,
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeVariant: 'default' as const,
    },
    error: {
      icon: type === 'connection' ? WifiOff : XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeVariant: 'destructive' as const,
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      badgeVariant: 'secondary' as const,
    },
    pending: {
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badgeVariant: 'secondary' as const,
    },
  };

  return configs[status];
};

const getTypeIcon = (type?: StatusIndicatorProps['type']) => {
  switch (type) {
    case 'appointment':
      return Calendar;
    case 'payment':
      return CreditCard;
    case 'consultation':
      return Video;
    case 'credit':
      return Star;
    case 'verification':
      return UserCheck;
    case 'connection':
      return Wifi;
    default:
      return null;
  }
};

export default function StatusIndicator({
  status,
  type,
  message,
  showIcon = true,
  showMessage = true,
  variant = 'default',
  actionLabel,
  onAction,
  autoHide = false,
  autoHideDelay = 3000,
  className = '',
}: StatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = getStatusConfig(status, type);
  const StatusIcon = config.icon;
  const TypeIcon = getTypeIcon(type);

  useEffect(() => {
    if (autoHide && (status === 'success' || status === 'error')) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [status, autoHide, autoHideDelay]);

  if (!isVisible) return null;

  const renderCompactVariant = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {showIcon && (
        <div className={`${config.color}`}>
          <StatusIcon 
            className={`h-4 w-4 ${config.animate ? 'animate-spin' : ''}`} 
          />
        </div>
      )}
      {showMessage && message && (
        <span className="text-sm font-medium">{message}</span>
      )}
    </motion.div>
  );

  const renderInlineVariant = () => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${config.bgColor} ${config.borderColor} border ${className}`}
    >
      {showIcon && (
        <StatusIcon 
          className={`h-3 w-3 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
        />
      )}
      {showMessage && message && (
        <span className="text-xs font-medium">{message}</span>
      )}
    </motion.div>
  );

  const renderDefaultVariant = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center justify-between p-3 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <div className="flex items-center gap-3">
        {showIcon && (
          <div className="flex items-center gap-2">
            {TypeIcon && (
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <StatusIcon 
              className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          {showMessage && message && (
            <span className="text-sm font-medium">{message}</span>
          )}
          <Badge variant={config.badgeVariant} className="w-fit text-xs">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </div>
      
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="ml-4"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {variant === 'compact' && renderCompactVariant()}
      {variant === 'inline' && renderInlineVariant()}
      {variant === 'default' && renderDefaultVariant()}
    </AnimatePresence>
  );
}

// Hook for managing status states
export function useStatusIndicator(initialStatus: StatusIndicatorProps['status'] = 'idle') {
  const [status, setStatus] = useState<StatusIndicatorProps['status']>(initialStatus);
  const [message, setMessage] = useState<string>('');

  const updateStatus = (
    newStatus: StatusIndicatorProps['status'], 
    newMessage?: string
  ) => {
    setStatus(newStatus);
    if (newMessage !== undefined) {
      setMessage(newMessage);
    }
  };

  const setLoading = (message?: string) => updateStatus('loading', message);
  const setSuccess = (message?: string) => updateStatus('success', message);
  const setError = (message?: string) => updateStatus('error', message);
  const setWarning = (message?: string) => updateStatus('warning', message);
  const setPending = (message?: string) => updateStatus('pending', message);
  const setIdle = (message?: string) => updateStatus('idle', message);

  return {
    status,
    message,
    updateStatus,
    setLoading,
    setSuccess,
    setError,
    setWarning,
    setPending,
    setIdle,
  };
}

// Predefined status messages
export const statusMessages = {
  appointment: {
    loading: 'Booking appointment...',
    success: 'Appointment booked successfully',
    error: 'Failed to book appointment',
    pending: 'Appointment pending confirmation',
  },
  payment: {
    loading: 'Processing payment...',
    success: 'Payment processed successfully',
    error: 'Payment failed',
    pending: 'Payment pending',
  },
  consultation: {
    loading: 'Starting consultation...',
    success: 'Consultation started',
    error: 'Failed to start consultation',
    pending: 'Waiting for consultation',
  },
  credit: {
    loading: 'Processing credits...',
    success: 'Credits updated',
    error: 'Failed to update credits',
    warning: 'Low credit balance',
  },
  verification: {
    loading: 'Verifying application...',
    success: 'Application approved',
    error: 'Application rejected',
    pending: 'Application under review',
  },
  connection: {
    loading: 'Connecting...',
    success: 'Connected',
    error: 'Connection failed',
    idle: 'Ready to connect',
  },
};
