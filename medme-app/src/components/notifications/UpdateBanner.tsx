'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Calendar,
  CreditCard,
  Video,
  Star,
  UserCheck
} from 'lucide-react';

export interface UpdateBannerProps {
  type: 'appointment' | 'payment' | 'consultation' | 'credit' | 'verification' | 'system';
  variant: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  showRefresh?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const getVariantConfig = (variant: UpdateBannerProps['variant']) => {
  const configs = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-800 dark:text-blue-200',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badgeVariant: 'secondary' as const,
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-800 dark:text-green-200',
      iconColor: 'text-green-600 dark:text-green-400',
      badgeVariant: 'default' as const,
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-800 dark:text-yellow-200',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      badgeVariant: 'secondary' as const,
    },
    error: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
      badgeVariant: 'destructive' as const,
    },
  };

  return configs[variant];
};

const getTypeIcon = (type: UpdateBannerProps['type']) => {
  const icons = {
    appointment: Calendar,
    payment: CreditCard,
    consultation: Video,
    credit: Star,
    verification: UserCheck,
    system: Info,
  };

  return icons[type];
};

export default function UpdateBanner({
  type,
  variant,
  title,
  message,
  actionLabel,
  onAction,
  dismissible = true,
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000,
  showRefresh = false,
  onRefresh,
  className = '',
}: UpdateBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const config = getVariantConfig(variant);
  const VariantIcon = config.icon;
  const TypeIcon = getTypeIcon(type);

  useEffect(() => {
    if (autoHide && (variant === 'success' || variant === 'info')) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [variant, autoHide, autoHideDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`border-l-4 ${config.bgColor} ${config.borderColor} ${className}`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {/* Type and Variant Icons */}
              <div className="flex items-center gap-2 mt-0.5">
                <TypeIcon className={`h-4 w-4 ${config.iconColor}`} />
                <VariantIcon className={`h-4 w-4 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold text-sm ${config.textColor}`}>
                    {title}
                  </h4>
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                </div>
                <p className={`text-sm ${config.textColor} leading-relaxed`}>
                  {message}
                </p>

                {/* Actions */}
                {(actionLabel || showRefresh) && (
                  <div className="flex items-center gap-2 mt-3">
                    {actionLabel && onAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onAction}
                        className={`${config.textColor} border-current hover:bg-current/10`}
                      >
                        {actionLabel}
                      </Button>
                    )}
                    {showRefresh && onRefresh && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`${config.textColor} hover:bg-current/10`}
                      >
                        <RefreshCw 
                          className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} 
                        />
                        Refresh
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dismiss Button */}
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className={`${config.textColor} hover:bg-current/10 ml-2 flex-shrink-0`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing update banners
export function useUpdateBanner() {
  const [banners, setBanners] = useState<Array<UpdateBannerProps & { id: string }>>([]);

  const showBanner = (banner: Omit<UpdateBannerProps, 'onDismiss'>) => {
    const id = `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newBanner = {
      ...banner,
      id,
      onDismiss: () => dismissBanner(id),
    };

    setBanners(prev => [...prev, newBanner]);
    return id;
  };

  const dismissBanner = (id: string) => {
    setBanners(prev => prev.filter(banner => banner.id !== id));
  };

  const dismissAllBanners = () => {
    setBanners([]);
  };

  return {
    banners,
    showBanner,
    dismissBanner,
    dismissAllBanners,
  };
}

// Predefined banner templates
export const bannerTemplates = {
  appointmentBooked: (doctorName: string, date: string) => ({
    type: 'appointment' as const,
    variant: 'success' as const,
    title: 'Appointment Booked',
    message: `Your appointment with Dr. ${doctorName} on ${date} has been successfully booked.`,
    actionLabel: 'View Appointment',
    autoHide: true,
    autoHideDelay: 6000,
  }),

  appointmentUpdated: (status: string) => ({
    type: 'appointment' as const,
    variant: 'info' as const,
    title: 'Appointment Updated',
    message: `Your appointment status has been updated to ${status}.`,
    showRefresh: true,
    autoHide: true,
  }),

  consultationReady: (sessionId: string) => ({
    type: 'consultation' as const,
    variant: 'info' as const,
    title: 'Consultation Ready',
    message: 'Your consultation is ready to start. Click to join the video call.',
    actionLabel: 'Join Consultation',
    onAction: () => window.location.href = `/consultation/${sessionId}`,
  }),

  paymentProcessed: (amount: string, credits: number) => ({
    type: 'payment' as const,
    variant: 'success' as const,
    title: 'Payment Successful',
    message: `Payment of ${amount} processed. ${credits} credits added to your account.`,
    actionLabel: 'View Subscription',
    autoHide: true,
  }),

  lowCredits: (remaining: number) => ({
    type: 'credit' as const,
    variant: 'warning' as const,
    title: 'Low Credit Balance',
    message: `You have ${remaining} credits remaining. Consider purchasing more to continue booking consultations.`,
    actionLabel: 'Buy Credits',
  }),

  systemMaintenance: (duration?: string) => ({
    type: 'system' as const,
    variant: 'warning' as const,
    title: 'System Maintenance',
    message: `Scheduled maintenance${duration ? ` for ${duration}` : ''}. Some features may be temporarily unavailable.`,
    dismissible: false,
  }),
};
