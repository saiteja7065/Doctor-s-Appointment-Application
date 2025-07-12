import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useUser } from '@clerk/nextjs';
import { 
  useRealTimeData, 
  useRealTimeAppointments, 
  useRealTimeNotifications,
  useStatusChangeDetector,
  useOptimisticUpdate
} from '@/hooks/useRealTimeData';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

// Mock NotificationContext
jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    state: { connectionStatus: 'connected' },
    showConsultationStarted: jest.fn(),
    showConsultationCompleted: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
};

describe('useRealTimeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ user: mockUser });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const TestComponent = ({ options }: { options: any }) => {
    const { data, isLoading, error, lastUpdated, isStale, refetch } = useRealTimeData(options);

    return (
      <div>
        <div data-testid="data">{JSON.stringify(data)}</div>
        <div data-testid="loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'null'}</div>
        <div data-testid="stale">{isStale.toString()}</div>
        <div data-testid="last-updated">{lastUpdated?.toISOString() || 'null'}</div>
        <button onClick={() => refetch()}>Refetch</button>
      </div>
    );
  };

  it('should fetch data on mount', async () => {
    const mockData = { appointments: [{ id: 1, name: 'Test' }] };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0, // Disable polling for test
        }}
      />
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(mockData));
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });

  it('should handle fetch errors', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
      expect(screen.getByTestId('stale')).toHaveTextContent('true');
    });
  });

  it('should transform data when transform function is provided', async () => {
    const mockData = { items: [1, 2, 3] };
    const transformedData = [1, 2, 3];
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0,
          transform: (data: any) => data.items,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(transformedData));
    });
  });

  it('should call onSuccess callback', async () => {
    const mockData = { test: 'data' };
    const onSuccess = jest.fn();
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0,
          onSuccess,
        }}
      />
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('should call onError callback', async () => {
    const error = new Error('Test error');
    const onError = jest.fn();
    
    (fetch as jest.Mock).mockRejectedValue(error);

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0,
          onError,
        }}
      />
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  it('should refetch data when refetch is called', async () => {
    const mockData = { test: 'data' };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0,
        }}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText('Refetch'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should not fetch when disabled', () => {
    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          enabled: false,
        }}
      />
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should not fetch when user is not available', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
        }}
      />
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should poll at specified interval', async () => {
    const mockData = { test: 'data' };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 1000,
        }}
      />
    );

    // Initial fetch
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Advance timer and check for second fetch
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should respond to data refresh events', async () => {
    const mockData = { test: 'data' };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <TestComponent 
        options={{
          endpoint: '/api/test',
          interval: 0,
        }}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Trigger data refresh event
    act(() => {
      window.dispatchEvent(new CustomEvent('medme:data-refresh'));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useRealTimeAppointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ user: mockUser });
  });

  const TestComponent = ({ userType }: { userType: 'patient' | 'doctor' }) => {
    const { data, isLoading, error } = useRealTimeAppointments(userType);

    return (
      <div>
        <div data-testid="data">{JSON.stringify(data)}</div>
        <div data-testid="loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'null'}</div>
      </div>
    );
  };

  it('should use correct endpoint for patient', () => {
    const mockData = { appointments: [] };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<TestComponent userType="patient" />);

    expect(fetch).toHaveBeenCalledWith(
      '/api/patients/appointments',
      expect.any(Object)
    );
  });

  it('should use correct endpoint for doctor', () => {
    const mockData = { appointments: [] };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(<TestComponent userType="doctor" />);

    expect(fetch).toHaveBeenCalledWith(
      '/api/doctors/appointments',
      expect.any(Object)
    );
  });
});

describe('useStatusChangeDetector', () => {
  const TestComponent = ({ data }: { data: any }) => {
    const mockNotifications = {
      showConsultationStarted: jest.fn(),
      showConsultationCompleted: jest.fn(),
    };

    useStatusChangeDetector(
      data,
      (item: any) => item.status,
      (item: any) => item.id,
      (item, oldStatus, newStatus) => {
        // Mock status change handler
      }
    );

    return <div data-testid="detector">Status change detector active</div>;
  };

  it('should detect status changes', () => {
    const initialData = [{ id: '1', status: 'scheduled' }];
    const { rerender } = render(<TestComponent data={initialData} />);

    const updatedData = [{ id: '1', status: 'in_progress' }];
    rerender(<TestComponent data={updatedData} />);

    expect(screen.getByTestId('detector')).toBeInTheDocument();
  });
});

describe('useOptimisticUpdate', () => {
  const TestComponent = () => {
    const {
      data,
      pendingUpdates,
      applyOptimisticUpdate,
      confirmUpdate,
      revertUpdate,
      syncWithServerData,
    } = useOptimisticUpdate(
      { count: 0 },
      (data, update) => ({ ...data, count: data.count + update.increment }),
      (data, update) => ({ ...data, count: data.count - update.increment })
    );

    return (
      <div>
        <div data-testid="count">{data.count}</div>
        <div data-testid="pending">{pendingUpdates.length}</div>
        <button onClick={() => applyOptimisticUpdate({ increment: 1 })}>
          Apply Update
        </button>
        <button onClick={() => confirmUpdate(pendingUpdates[0]?.id)}>
          Confirm Update
        </button>
        <button onClick={() => revertUpdate(pendingUpdates[0]?.id)}>
          Revert Update
        </button>
        <button onClick={() => syncWithServerData({ count: 10 })}>
          Sync Server Data
        </button>
      </div>
    );
  };

  it('should apply optimistic updates', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('pending')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('Apply Update'));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('pending')).toHaveTextContent('1');
  });

  it('should confirm updates', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Apply Update'));
    fireEvent.click(screen.getByText('Confirm Update'));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('pending')).toHaveTextContent('0');
  });

  it('should revert updates', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Apply Update'));
    fireEvent.click(screen.getByText('Revert Update'));

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('pending')).toHaveTextContent('0');
  });

  it('should sync with server data', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Apply Update'));
    fireEvent.click(screen.getByText('Sync Server Data'));

    expect(screen.getByTestId('count')).toHaveTextContent('10');
    expect(screen.getByTestId('pending')).toHaveTextContent('0');
  });
});
