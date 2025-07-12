'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNotifications } from '@/contexts/NotificationContext';

export interface RealTimeDataOptions {
  endpoint: string;
  interval?: number;
  enabled?: boolean;
  dependencies?: any[];
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  transform?: (data: any) => any;
  compare?: (oldData: any, newData: any) => boolean;
}

export interface RealTimeDataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isStale: boolean;
}

export function useRealTimeData<T = any>(options: RealTimeDataOptions): RealTimeDataState<T> & {
  refetch: () => Promise<void>;
  markStale: () => void;
} {
  const {
    endpoint,
    interval = 30000, // 30 seconds default
    enabled = true,
    dependencies = [],
    onSuccess,
    onError,
    transform,
    compare,
  } = options;

  const { user } = useUser();
  const { state: notificationState } = useNotifications();
  
  const [state, setState] = useState<RealTimeDataState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    isStale: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !user) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      const newData = transform ? transform(rawData) : rawData;

      setState(prev => {
        // Check if data has actually changed
        const hasChanged = compare ? !compare(prev.data, newData) : JSON.stringify(prev.data) !== JSON.stringify(newData);
        
        return {
          data: newData,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
          isStale: false,
        };
      });

      onSuccess?.(newData);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isStale: true,
      }));

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [endpoint, enabled, user, transform, compare, onSuccess, onError]);

  const markStale = useCallback(() => {
    setState(prev => ({ ...prev, isStale: true }));
  }, []);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !user) return;

    // Initial fetch
    fetchData();

    // Set up interval
    if (interval > 0) {
      intervalRef.current = setInterval(fetchData, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, user, interval, fetchData, ...dependencies]);

  // Listen for data refresh events
  useEffect(() => {
    const handleDataRefresh = () => {
      fetchData();
    };

    window.addEventListener('medme:data-refresh', handleDataRefresh);
    return () => window.removeEventListener('medme:data-refresh', handleDataRefresh);
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (state.isStale) {
        fetchData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchData, state.isStale]);

  return {
    ...state,
    refetch: fetchData,
    markStale,
  };
}

// Specialized hooks for common data types
export function useRealTimeAppointments(userType: 'patient' | 'doctor' = 'patient') {
  const endpoint = userType === 'patient' 
    ? '/api/patients/appointments'
    : '/api/doctors/appointments';

  return useRealTimeData({
    endpoint,
    interval: 15000, // Check every 15 seconds for appointments
    transform: (data) => data.appointments || [],
    compare: (oldData, newData) => {
      if (!oldData || !newData) return false;
      if (oldData.length !== newData.length) return false;
      
      // Compare appointment statuses and times
      return oldData.every((oldAppt: any, index: number) => {
        const newAppt = newData[index];
        return oldAppt?.status === newAppt?.status && 
               oldAppt?.appointmentDate === newAppt?.appointmentDate &&
               oldAppt?.appointmentTime === newAppt?.appointmentTime;
      });
    },
  });
}

export function useRealTimeNotifications() {
  return useRealTimeData({
    endpoint: '/api/notifications',
    interval: 20000, // Check every 20 seconds
    transform: (data) => ({
      notifications: data.notifications || [],
      unreadCount: data.unreadCount || 0,
    }),
  });
}

export function useRealTimeSubscription() {
  return useRealTimeData({
    endpoint: '/api/patients/subscription',
    interval: 60000, // Check every minute
    transform: (data) => ({
      creditBalance: data.creditBalance || 0,
      subscriptionPlan: data.subscriptionPlan || 'free',
      subscriptionStatus: data.subscriptionStatus || 'inactive',
      transactions: data.transactions || [],
    }),
  });
}

export function useRealTimeDoctorStats() {
  return useRealTimeData({
    endpoint: '/api/doctors/stats',
    interval: 30000, // Check every 30 seconds
    transform: (data) => ({
      totalAppointments: data.totalAppointments || 0,
      totalEarnings: data.totalEarnings || 0,
      totalPatients: data.totalPatients || 0,
      todayAppointments: data.todayAppointments || 0,
      upcomingAppointments: data.upcomingAppointments || 0,
      averageRating: data.averageRating || 0,
      monthlyEarnings: data.monthlyEarnings || 0,
    }),
  });
}

export function useRealTimeConsultationStatus(sessionId?: string) {
  return useRealTimeData({
    endpoint: sessionId ? `/api/consultations/${sessionId}/status` : '',
    interval: 5000, // Check every 5 seconds during consultation
    enabled: !!sessionId,
    dependencies: [sessionId],
    transform: (data) => ({
      status: data.status || 'scheduled',
      participants: data.participants || [],
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration || 0,
    }),
  });
}

// Hook for managing multiple real-time data sources
export function useRealTimeDataManager() {
  const [dataSources, setDataSources] = useState<Map<string, any>>(new Map());

  const registerDataSource = useCallback((key: string, data: any) => {
    setDataSources(prev => new Map(prev.set(key, data)));
  }, []);

  const unregisterDataSource = useCallback((key: string) => {
    setDataSources(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const getDataSource = useCallback((key: string) => {
    return dataSources.get(key);
  }, [dataSources]);

  const refreshAllDataSources = useCallback(() => {
    window.dispatchEvent(new CustomEvent('medme:data-refresh', {
      detail: { timestamp: new Date() }
    }));
  }, []);

  return {
    dataSources: Array.from(dataSources.entries()),
    registerDataSource,
    unregisterDataSource,
    getDataSource,
    refreshAllDataSources,
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T, update: any) => T,
  revertFn?: (data: T, update: any) => T
) {
  const [data, setData] = useState<T>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);

  const applyOptimisticUpdate = useCallback((update: any) => {
    const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setData(prev => updateFn(prev, update));
    setPendingUpdates(prev => [...prev, { id: updateId, update }]);
    
    return updateId;
  }, [updateFn]);

  const confirmUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
  }, []);

  const revertUpdate = useCallback((updateId: string) => {
    const pendingUpdate = pendingUpdates.find(u => u.id === updateId);
    if (pendingUpdate && revertFn) {
      setData(prev => revertFn(prev, pendingUpdate.update));
    }
    setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
  }, [pendingUpdates, revertFn]);

  const syncWithServerData = useCallback((serverData: T) => {
    setData(serverData);
    setPendingUpdates([]); // Clear all pending updates
  }, []);

  return {
    data,
    pendingUpdates,
    applyOptimisticUpdate,
    confirmUpdate,
    revertUpdate,
    syncWithServerData,
  };
}

// Hook for detecting status changes and triggering notifications
export function useStatusChangeDetector<T>(
  data: T | null,
  getStatusField: (item: T) => string,
  getIdentifier: (item: T) => string,
  onStatusChange?: (item: T, oldStatus: string, newStatus: string) => void
) {
  const previousDataRef = useRef<T | null>(null);
  const { showAppointmentBooked, showAppointmentCancelled, showConsultationStarted, showConsultationCompleted } = useNotifications();

  useEffect(() => {
    if (!data || !previousDataRef.current) {
      previousDataRef.current = data;
      return;
    }

    const currentData = Array.isArray(data) ? data : [data];
    const previousData = Array.isArray(previousDataRef.current) ? previousDataRef.current : [previousDataRef.current];

    // Detect status changes
    currentData.forEach((currentItem: any) => {
      const currentId = getIdentifier(currentItem);
      const currentStatus = getStatusField(currentItem);

      const previousItem = previousData.find((item: any) => getIdentifier(item) === currentId);

      if (previousItem) {
        const previousStatus = getStatusField(previousItem);

        if (previousStatus !== currentStatus) {
          // Status changed - trigger notification
          onStatusChange?.(currentItem, previousStatus, currentStatus);

          // Trigger specific notifications based on status change
          if (currentItem.type === 'appointment') {
            handleAppointmentStatusChange(currentItem, previousStatus, currentStatus);
          } else if (currentItem.type === 'consultation') {
            handleConsultationStatusChange(currentItem, previousStatus, currentStatus);
          }
        }
      } else {
        // New item detected
        if (currentItem.type === 'appointment' && currentStatus === 'scheduled') {
          showAppointmentBooked(
            currentItem.doctorName || 'Doctor',
            currentItem.appointmentDate || 'Unknown date'
          );
        }
      }
    });

    previousDataRef.current = data;
  }, [data, getStatusField, getIdentifier, onStatusChange]);

  const handleAppointmentStatusChange = (appointment: any, oldStatus: string, newStatus: string) => {
    switch (newStatus) {
      case 'cancelled':
        showAppointmentCancelled(
          appointment.doctorName || 'Doctor',
          appointment.refunded || false
        );
        break;
      case 'in_progress':
        if (appointment.sessionId) {
          showConsultationStarted(
            appointment.sessionId,
            appointment.patientName
          );
        }
        break;
      case 'completed':
        showConsultationCompleted(appointment.earnings);
        break;
    }
  };

  const handleConsultationStatusChange = (consultation: any, oldStatus: string, newStatus: string) => {
    switch (newStatus) {
      case 'in_progress':
        showConsultationStarted(
          consultation.sessionId,
          consultation.patientName
        );
        break;
      case 'completed':
        showConsultationCompleted(consultation.earnings);
        break;
    }
  };
}
