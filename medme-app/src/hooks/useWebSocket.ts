'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastHeartbeat: Date | null;
}

interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface ConsultationMessage {
  userId: string;
  role: 'patient' | 'doctor';
  message: string;
  timestamp: string;
  sessionId: string;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    enableHeartbeat = true,
    heartbeatInterval = 30000, // 30 seconds
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const { user, isLoaded } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastHeartbeat: null
  });

  // Event handlers
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [consultationMessages, setConsultationMessages] = useState<ConsultationMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!user || !isLoaded || socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        auth: {
          token: 'demo_token', // In production, use actual JWT token
          userId: user.id,
          role: user.publicMetadata?.role || 'patient'
        },
        reconnection: true,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectDelay
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('WebSocket connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null
        }));
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        if (enableHeartbeat) {
          startHeartbeat();
        }
      });

      socket.on('connected', (data) => {
        console.log('WebSocket authentication successful:', data);
        toast.success('Connected to real-time updates');
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));
        stopHeartbeat();

        // Attempt reconnection if not manual disconnect
        if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < reconnectAttempts) {
          attemptReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message
        }));
        
        if (reconnectAttemptsRef.current < reconnectAttempts) {
          attemptReconnect();
        } else {
          toast.error('Failed to connect to real-time updates');
        }
      });

      // Notification events
      socket.on('notification', (notification: NotificationData) => {
        console.log('Received notification:', notification);
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
        
        // Show toast notification
        toast(notification.title, {
          description: notification.message,
          duration: 5000
        });
      });

      // Consultation events
      socket.on('consultation-message', (message: ConsultationMessage) => {
        console.log('Received consultation message:', message);
        setConsultationMessages(prev => [...prev, message]);
      });

      socket.on('participant-joined', (data) => {
        console.log('Participant joined consultation:', data);
        toast.info(`${data.role} joined the consultation`);
      });

      socket.on('participant-left', (data) => {
        console.log('Participant left consultation:', data);
        toast.info(`${data.role} left the consultation`);
      });

      socket.on('user-typing', (data) => {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      });

      socket.on('user-stopped-typing', (data) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      socket.on('consultation-update', (update) => {
        console.log('Consultation update:', update);
        // Handle consultation updates (status changes, etc.)
      });

      // Heartbeat events
      socket.on('heartbeat-ack', (data) => {
        setState(prev => ({
          ...prev,
          lastHeartbeat: new Date(data.timestamp)
        }));
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to initialize connection'
      }));
    }
  }, [user, isLoaded, enableHeartbeat, reconnectAttempts, reconnectDelay]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopHeartbeat();
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
  }, []);

  // Attempt reconnection
  const attemptReconnect = useCallback(() => {
    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})`);
      connect();
    }, delay);
  }, [connect, reconnectAttempts, reconnectDelay]);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat');
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Join consultation room
  const joinConsultation = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-consultation', { sessionId });
      console.log(`Joining consultation: ${sessionId}`);
    }
  }, []);

  // Leave consultation room
  const leaveConsultation = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-consultation', { sessionId });
      console.log(`Leaving consultation: ${sessionId}`);
    }
  }, []);

  // Send consultation message
  const sendConsultationMessage = useCallback((sessionId: string, message: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('consultation-message', {
        sessionId,
        message,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  // Send typing indicators
  const startTyping = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', { sessionId });
    }
  }, []);

  const stopTyping = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', { sessionId });
    }
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear consultation messages
  const clearConsultationMessages = useCallback(() => {
    setConsultationMessages([]);
  }, []);

  // Auto-connect when user is loaded
  useEffect(() => {
    if (autoConnect && isLoaded && user) {
      connect();
    }

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, isLoaded, user, connect, disconnect]);

  return {
    // Connection state
    ...state,
    
    // Connection methods
    connect,
    disconnect,
    
    // Consultation methods
    joinConsultation,
    leaveConsultation,
    sendConsultationMessage,
    startTyping,
    stopTyping,
    
    // Data
    notifications,
    consultationMessages,
    typingUsers: Array.from(typingUsers),
    
    // Utility methods
    clearNotifications,
    clearConsultationMessages,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current
  };
}

export default useWebSocket;
