'use client';

import { useState, useEffect } from 'react';
// Removed framer-motion for better performance - using CSS animations
import { useRealTimeNotifications } from '@/hooks/useRealTimeData';
import { useNotifications } from '@/contexts/NotificationContext';
import { withRealTimeData, WithRealTimeDataProps } from '@/components/hoc/withRealTimeData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Calendar,
  CreditCard,
  UserCheck,
  Video,
  AlertTriangle,
  Info,
  Star,
  Trash2,
  MoreVertical,
  RefreshCw
} from 'lucide-react';

interface NotificationData {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
}

interface RealTimeNotificationCenterProps extends WithRealTimeDataProps {
  maxItems?: number;
  showMarkAllAsRead?: boolean;
  showClearAll?: boolean;
  onNotificationClick?: (notification: NotificationData) => void;
  className?: string;
}

const getNotificationIcon = (type: string) => {
  const icons = {
    appointment: Calendar,
    payment: CreditCard,
    consultation: Video,
    credit: Star,
    verification: UserCheck,
    system: Info,
    default: Bell,
  };

  return icons[type as keyof typeof icons] || icons.default;
};

const getPriorityConfig = (priority: string) => {
  const configs = {
    low: {
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      badge: 'secondary' as const,
    },
    medium: {
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badge: 'default' as const,
    },
    high: {
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      badge: 'default' as const,
    },
    urgent: {
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badge: 'destructive' as const,
    },
  };

  return configs[priority as keyof typeof configs] || configs.medium;
};

function NotificationCenterComponent({
  realTimeData,
  isLoading,
  error,
  maxItems = 10,
  showMarkAllAsRead = true,
  showClearAll = true,
  onNotificationClick,
  className = '',
}: RealTimeNotificationCenterProps) {
  const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());
  const [previousCount, setPreviousCount] = useState(0);

  const notificationData = realTimeData || { notifications: [], unreadCount: 0 };
  const { notifications, unreadCount } = notificationData;
  const displayedNotifications = notifications.slice(0, maxItems);

  // Highlight new notifications
  useEffect(() => {
    if (unreadCount > previousCount && previousCount > 0) {
      // New notifications arrived - highlight them
      const newNotifications = notifications.slice(0, unreadCount - previousCount);
      const newIds = new Set(newNotifications.map((n: NotificationData) => n._id));
      
      setHighlightedItems(newIds);
      
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedItems(new Set());
      }, 3000);
    }
    setPreviousCount(unreadCount);
  }, [unreadCount, previousCount, notifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationIds: [notificationId],
        }),
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' }),
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationIds: [notificationId],
        }),
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isLoading && !notifications.length) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-primary" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          {(showMarkAllAsRead || showClearAll) && unreadCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showMarkAllAsRead && (
                  <DropdownMenuItem onClick={handleMarkAllAsRead}>
                    <CheckCheck className="h-4 w-4 mr-2" />
                    Mark all as read
                  </DropdownMenuItem>
                )}
                {showClearAll && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {/* Implement clear all */}}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear all
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {displayedNotifications.map((notification: NotificationData) => {
                  const NotificationIcon = getNotificationIcon(notification.type);
                  const priorityConfig = getPriorityConfig(notification.priority);
                  const isHighlighted = highlightedItems.has(notification._id);

                  return (
                    <div
                      key={notification._id}
                      className={`animate-slide-in-left p-3 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-sm ${
                        notification.isRead
                          ? 'bg-muted/30 border-muted'
                          : `${priorityConfig.bgColor} ${priorityConfig.borderColor}`
                      } ${isHighlighted ? 'ring-2 ring-blue-400 scale-105' : ''}`}
                      style={{
                        backgroundColor: isHighlighted ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        animationDelay: `${notifications.indexOf(notification) * 50}ms`
                      }}
                      onClick={() => {
                        onNotificationClick?.(notification);
                        if (!notification.isRead) {
                          handleMarkAsRead(notification._id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${priorityConfig.color}`}>
                          <NotificationIcon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-medium text-sm ${
                              notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                              {!notification.isRead && (
                                <div className="h-2 w-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                          </div>
                          
                          <p className={`text-sm mt-1 ${
                            notification.isRead ? 'text-muted-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {notification.actionLabel && notification.actionUrl && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto mt-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = notification.actionUrl!;
                              }}
                            >
                              {notification.actionLabel} →
                            </Button>
                          )}
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.isRead && (
                              <DropdownMenuItem onClick={() => handleMarkAsRead(notification._id)}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark as read
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteNotification(notification._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Export the component wrapped with real-time data
export default withRealTimeData(NotificationCenterComponent, {
  endpoint: '/api/notifications',
  interval: 10000,
  showConnectionStatus: false,
  showLastUpdated: false,
  showRefreshButton: false,
  autoRefreshOnError: true,
  transform: (data) => ({
    notifications: data.notifications || [],
    unreadCount: data.unreadCount || 0,
  }),
});
