'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { showStatusUpdateToast, statusUpdateTemplates, StatusUpdateData } from '@/components/notifications/StatusUpdateToast';
import { useUpdateBanner, bannerTemplates } from '@/components/notifications/UpdateBanner';

// Notification state interface
export interface NotificationState {
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  pendingUpdates: string[];
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// Notification actions
type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_UPDATE'; payload: Date }
  | { type: 'ADD_PENDING_UPDATE'; payload: string }
  | { type: 'REMOVE_PENDING_UPDATE'; payload: string }
  | { type: 'CLEAR_PENDING_UPDATES' }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'reconnecting' };

// Initial state
const initialState: NotificationState = {
  isLoading: false,
  error: null,
  lastUpdate: null,
  pendingUpdates: [],
  connectionStatus: 'connected',
};

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LAST_UPDATE':
      return { ...state, lastUpdate: action.payload };
    case 'ADD_PENDING_UPDATE':
      return { 
        ...state, 
        pendingUpdates: [...state.pendingUpdates, action.payload] 
      };
    case 'REMOVE_PENDING_UPDATE':
      return { 
        ...state, 
        pendingUpdates: state.pendingUpdates.filter(id => id !== action.payload) 
      };
    case 'CLEAR_PENDING_UPDATES':
      return { ...state, pendingUpdates: [] };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    default:
      return state;
  }
}

// Context interface
interface NotificationContextType {
  state: NotificationState;
  
  // Status update methods
  showAppointmentBooked: (doctorName: string, appointmentDate: string) => void;
  showAppointmentCancelled: (doctorName: string, refunded: boolean) => void;
  showConsultationStarted: (sessionId: string, patientName?: string) => void;
  showConsultationCompleted: (earnings?: number) => void;
  showCreditDeducted: (amount: number, remaining: number) => void;
  showLowCreditWarning: (remaining: number) => void;
  showPaymentSuccessful: (amount: string, credits: number) => void;
  showPaymentFailed: (reason?: string) => void;
  showDoctorApplicationApproved: () => void;
  showDoctorApplicationRejected: (reason?: string) => void;
  showSystemMaintenance: (duration?: string) => void;
  
  // Banner methods
  showBanner: (banner: any) => string;
  dismissBanner: (id: string) => void;
  dismissAllBanners: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addPendingUpdate: (updateId: string) => void;
  removePendingUpdate: (updateId: string) => void;
  clearPendingUpdates: () => void;
  
  // Real-time updates
  triggerDataRefresh: () => void;
  checkForUpdates: () => Promise<void>;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user } = useUser();
  const { showBanner, dismissBanner, dismissAllBanners } = useUpdateBanner();

  // Status update methods using templates
  const showAppointmentBooked = useCallback((doctorName: string, appointmentDate: string) => {
    const template = statusUpdateTemplates.appointmentBooked(doctorName, appointmentDate);
    showStatusUpdateToast(template);
    
    // Also show banner for important updates
    showBanner(bannerTemplates.appointmentBooked(doctorName, appointmentDate));
    
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, [showBanner]);

  const showAppointmentCancelled = useCallback((doctorName: string, refunded: boolean) => {
    const template = statusUpdateTemplates.appointmentCancelled(doctorName, refunded);
    showStatusUpdateToast(template);
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, []);

  const showConsultationStarted = useCallback((sessionId: string, patientName?: string) => {
    const template = statusUpdateTemplates.consultationStarted(patientName);
    template.actionUrl = `/consultation/${sessionId}`;
    showStatusUpdateToast(template);
    
    // Show banner for consultation ready
    showBanner(bannerTemplates.consultationReady(sessionId));
    
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, [showBanner]);

  const showConsultationCompleted = useCallback((earnings?: number) => {
    const template = statusUpdateTemplates.consultationCompleted(earnings);
    showStatusUpdateToast(template);
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, []);

  const showCreditDeducted = useCallback((amount: number, remaining: number) => {
    const template = statusUpdateTemplates.creditDeducted(amount, remaining);
    showStatusUpdateToast(template);
    
    // Show low credit warning if needed
    if (remaining <= 2) {
      setTimeout(() => {
        showBanner(bannerTemplates.lowCredits(remaining));
      }, 2000);
    }
    
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, [showBanner]);

  const showLowCreditWarning = useCallback((remaining: number) => {
    const template = statusUpdateTemplates.lowCreditWarning(remaining);
    showStatusUpdateToast(template);
    showBanner(bannerTemplates.lowCredits(remaining));
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, [showBanner]);

  const showPaymentSuccessful = useCallback((amount: string, credits: number) => {
    const template = statusUpdateTemplates.paymentSuccessful(amount, credits);
    showStatusUpdateToast(template);
    showBanner(bannerTemplates.paymentProcessed(amount, credits));
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, [showBanner]);

  const showPaymentFailed = useCallback((reason?: string) => {
    const template = statusUpdateTemplates.paymentFailed(reason);
    showStatusUpdateToast(template);
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, []);

  const showDoctorApplicationApproved = useCallback(() => {
    const template = statusUpdateTemplates.doctorApplicationApproved();
    showStatusUpdateToast(template);
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, []);

  const showDoctorApplicationRejected = useCallback((reason?: string) => {
    const template = statusUpdateTemplates.doctorApplicationRejected(reason);
    showStatusUpdateToast(template);
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, []);

  const showSystemMaintenance = useCallback((duration?: string) => {
    const template = statusUpdateTemplates.systemMaintenance(duration);
    showStatusUpdateToast(template);
    showBanner(bannerTemplates.systemMaintenance(duration));
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, [showBanner]);

  // State management methods
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const addPendingUpdate = useCallback((updateId: string) => {
    dispatch({ type: 'ADD_PENDING_UPDATE', payload: updateId });
  }, []);

  const removePendingUpdate = useCallback((updateId: string) => {
    dispatch({ type: 'REMOVE_PENDING_UPDATE', payload: updateId });
  }, []);

  const clearPendingUpdates = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_UPDATES' });
  }, []);

  // Real-time update methods
  const triggerDataRefresh = useCallback(() => {
    // Trigger custom event for components to refresh their data
    window.dispatchEvent(new CustomEvent('medme:data-refresh', {
      detail: { timestamp: new Date() }
    }));
    dispatch({ type: 'SET_LAST_UPDATE', payload: new Date() });
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!user) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      
      // Check for pending notifications
      const response = await fetch('/api/notifications/check');
      if (response.ok) {
        const data = await response.json();
        
        // Process any new notifications
        if (data.hasUpdates) {
          triggerDataRefresh();
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to check for updates' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, triggerDataRefresh]);

  // Set up periodic update checking
  useEffect(() => {
    if (!user) return;

    // Initial check
    checkForUpdates();

    // Set up interval for periodic checks
    const interval = setInterval(checkForUpdates, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, checkForUpdates]);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      checkForUpdates();
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkForUpdates]);

  const contextValue: NotificationContextType = {
    state,
    showAppointmentBooked,
    showAppointmentCancelled,
    showConsultationStarted,
    showConsultationCompleted,
    showCreditDeducted,
    showLowCreditWarning,
    showPaymentSuccessful,
    showPaymentFailed,
    showDoctorApplicationApproved,
    showDoctorApplicationRejected,
    showSystemMaintenance,
    showBanner,
    dismissBanner,
    dismissAllBanners,
    setLoading,
    setError,
    addPendingUpdate,
    removePendingUpdate,
    clearPendingUpdates,
    triggerDataRefresh,
    checkForUpdates,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
