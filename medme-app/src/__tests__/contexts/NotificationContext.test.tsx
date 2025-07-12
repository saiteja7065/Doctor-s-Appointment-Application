import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useUser } from '@clerk/nextjs';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock showStatusUpdateToast
jest.mock('@/components/notifications/StatusUpdateToast', () => ({
  showStatusUpdateToast: jest.fn(),
  statusUpdateTemplates: {
    appointmentBooked: jest.fn(() => ({ type: 'appointment', status: 'success' })),
    appointmentCancelled: jest.fn(() => ({ type: 'appointment', status: 'info' })),
    consultationStarted: jest.fn(() => ({ type: 'consultation', status: 'info' })),
    consultationCompleted: jest.fn(() => ({ type: 'consultation', status: 'success' })),
    creditDeducted: jest.fn(() => ({ type: 'credit', status: 'info' })),
    lowCreditWarning: jest.fn(() => ({ type: 'credit', status: 'warning' })),
    paymentSuccessful: jest.fn(() => ({ type: 'payment', status: 'success' })),
    paymentFailed: jest.fn(() => ({ type: 'payment', status: 'error' })),
    doctorApplicationApproved: jest.fn(() => ({ type: 'verification', status: 'success' })),
    doctorApplicationRejected: jest.fn(() => ({ type: 'verification', status: 'error' })),
    systemMaintenance: jest.fn(() => ({ type: 'system', status: 'warning' })),
  },
}));

// Mock useUpdateBanner
jest.mock('@/components/notifications/UpdateBanner', () => ({
  useUpdateBanner: () => ({
    showBanner: jest.fn(),
    dismissBanner: jest.fn(),
    dismissAllBanners: jest.fn(),
  }),
  bannerTemplates: {
    appointmentBooked: jest.fn(),
    consultationReady: jest.fn(),
    paymentProcessed: jest.fn(),
    lowCredits: jest.fn(),
    systemMaintenance: jest.fn(),
  },
}));

const mockUser = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
};

const TestComponent = () => {
  const {
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
    setLoading,
    setError,
    addPendingUpdate,
    removePendingUpdate,
    clearPendingUpdates,
    triggerDataRefresh,
    checkForUpdates,
  } = useNotifications();

  return (
    <div>
      <div data-testid="loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || 'null'}</div>
      <div data-testid="connection-status">{state.connectionStatus}</div>
      <div data-testid="pending-updates">{state.pendingUpdates.length}</div>
      
      <button onClick={() => showAppointmentBooked('Dr. Smith', '2024-01-15')}>
        Show Appointment Booked
      </button>
      <button onClick={() => showAppointmentCancelled('Dr. Smith', true)}>
        Show Appointment Cancelled
      </button>
      <button onClick={() => showConsultationStarted('session123', 'John Doe')}>
        Show Consultation Started
      </button>
      <button onClick={() => showConsultationCompleted(50)}>
        Show Consultation Completed
      </button>
      <button onClick={() => showCreditDeducted(2, 8)}>
        Show Credit Deducted
      </button>
      <button onClick={() => showLowCreditWarning(1)}>
        Show Low Credit Warning
      </button>
      <button onClick={() => showPaymentSuccessful('$29.99', 10)}>
        Show Payment Successful
      </button>
      <button onClick={() => showPaymentFailed('Insufficient funds')}>
        Show Payment Failed
      </button>
      <button onClick={() => showDoctorApplicationApproved()}>
        Show Doctor Application Approved
      </button>
      <button onClick={() => showDoctorApplicationRejected('Invalid credentials')}>
        Show Doctor Application Rejected
      </button>
      <button onClick={() => showSystemMaintenance('2 hours')}>
        Show System Maintenance
      </button>
      <button onClick={() => setLoading(true)}>Set Loading</button>
      <button onClick={() => setError('Test error')}>Set Error</button>
      <button onClick={() => addPendingUpdate('update1')}>Add Pending Update</button>
      <button onClick={() => removePendingUpdate('update1')}>Remove Pending Update</button>
      <button onClick={() => clearPendingUpdates()}>Clear Pending Updates</button>
      <button onClick={() => triggerDataRefresh()}>Trigger Data Refresh</button>
      <button onClick={() => checkForUpdates()}>Check For Updates</button>
    </div>
  );
};

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ user: mockUser });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hasUpdates: false }),
    });
  });

  it('should provide initial state', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
    expect(screen.getByTestId('pending-updates')).toHaveTextContent('0');
  });

  it('should handle appointment booked notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Appointment Booked'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle appointment cancelled notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Appointment Cancelled'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle consultation started notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Consultation Started'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle consultation completed notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Consultation Completed'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle credit deducted notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Credit Deducted'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle low credit warning notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Low Credit Warning'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle payment successful notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Payment Successful'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle payment failed notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Payment Failed'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle doctor application approved notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Doctor Application Approved'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle doctor application rejected notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show Doctor Application Rejected'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should handle system maintenance notification', () => {
    const { showStatusUpdateToast } = require('@/components/notifications/StatusUpdateToast');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Show System Maintenance'));

    expect(showStatusUpdateToast).toHaveBeenCalled();
  });

  it('should update loading state', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Set Loading'));

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('should update error state', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Set Error'));

    expect(screen.getByTestId('error')).toHaveTextContent('Test error');
  });

  it('should manage pending updates', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Add Pending Update'));
    expect(screen.getByTestId('pending-updates')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('Remove Pending Update'));
    expect(screen.getByTestId('pending-updates')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Add Pending Update'));
    fireEvent.click(screen.getByText('Clear Pending Updates'));
    expect(screen.getByTestId('pending-updates')).toHaveTextContent('0');
  });

  it('should trigger data refresh', () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Trigger Data Refresh'));

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'medme:data-refresh',
      })
    );

    mockDispatchEvent.mockRestore();
  });

  it('should check for updates', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByText('Check For Updates'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications/check');
    });
  });

  it('should handle online/offline events', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');

    // Simulate coming back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
  });

  it('should throw error when used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');

    consoleSpy.mockRestore();
  });
});
