'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  Circle,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeNotificationsProps {
  className?: string;
  showConnectionStatus?: boolean;
  maxNotifications?: number;
  autoConnect?: boolean;
}

export default function RealTimeNotifications({
  className = '',
  showConnectionStatus = true,
  maxNotifications = 20,
  autoConnect = true
}: RealTimeNotificationsProps) {
  const {
    isConnected,
    isConnecting,
    error,
    lastHeartbeat,
    notifications,
    connect,
    disconnect,
    clearNotifications
  } = useWebSocket({ autoConnect });

  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Update unread count when new notifications arrive
  useEffect(() => {
    setUnreadCount(notifications.length);
  }, [notifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get connection status indicator
  const getConnectionStatus = () => {
    if (isConnecting) {
      return (
        <div className="flex items-center space-x-2 text-yellow-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Connecting...</span>
        </div>
      );
    }

    if (isConnected) {
      return (
        <div className="flex items-center space-x-2 text-green-600">
          <Wifi className="h-4 w-4" />
          <span className="text-sm">Connected</span>
          {lastHeartbeat && (
            <span className="text-xs text-muted-foreground">
              Last: {formatDistanceToNow(lastHeartbeat, { addSuffix: true })}
            </span>
          )}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Error: {error}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm">Disconnected</span>
      </div>
    );
  };

  // Handle connection toggle
  const handleConnectionToggle = () => {
    if (isConnected) {
      disconnect();
      toast.info('Disconnected from real-time updates');
    } else {
      connect();
      toast.info('Connecting to real-time updates...');
    }
  };

  // Clear all notifications
  const handleClearNotifications = () => {
    clearNotifications();
    setUnreadCount(0);
    toast.success('Notifications cleared');
  };

  // Mark notifications as read
  const handleMarkAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded) {
            handleMarkAsRead();
          }
        }}
        className="relative"
      >
        {isConnected ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Panel */}
      {isExpanded && (
        <Card className="absolute right-0 top-12 w-96 max-h-96 shadow-lg border z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Real-time Notifications</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Connection Status */}
            {showConnectionStatus && (
              <div className="flex items-center justify-between">
                {getConnectionStatus()}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleConnectionToggle}
                  disabled={isConnecting}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
              <div className="flex space-x-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearNotifications}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Separator className="mb-3" />

            {/* Notifications List */}
            <ScrollArea className="h-64">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  {!isConnected && (
                    <p className="text-xs mt-1">
                      Connect to receive real-time updates
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, maxNotifications).map((notification, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Connection Info */}
            {isConnected && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Real-time updates active</span>
                  <div className="flex items-center space-x-1">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    <span>Live</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
